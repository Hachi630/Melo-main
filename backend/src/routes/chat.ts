import express, { Request, Response } from "express";
import { protect } from "../middleware/auth";
import { AuthRequest } from "../types";
import { geminiService, ChatMessage } from "../services/geminiService";
import Conversation from "../models/Conversation";
import ProjectFolder from "../models/ProjectFolder";
import { generateImage } from "../services/imageGenerationService";
import { saveImage } from "../utils/imageStorage";
import { generateContentPlan } from "../services/contentPlanService";
import CalendarItem from "../models/CalendarItem";
import { readImageAsBase64 } from "../utils/imageReader";
import { extractTextFromFile } from "../utils/fileContentExtractor";

const router = express.Router();

// Helper function to generate conversation title from message
const generateTitle = (message: string): string => {
  if (!message || !message.trim()) {
    return "New Chat";
  }
  const trimmed = message.trim();
  if (trimmed.length <= 50) {
    return trimmed;
  }
  return trimmed.substring(0, 50) + "...";
};

// @desc    Send chat message
// @route   POST /api/chat
// @access  Private
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { message, conversationId, images, files, editMessageIndex } = req.body;

    // Validate message, images or files
    if (
      (!message || !message.trim()) &&
      (!images || !Array.isArray(images) || images.length === 0) &&
      (!files || !Array.isArray(files) || files.length === 0)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Message, images or files are required",
        });
    }

    let conversation = null;

    // If conversationId exists, load the conversation
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: user._id,
      });

      if (!conversation) {
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      }
    }

    // Handle edit message mode
    if (editMessageIndex !== undefined && editMessageIndex !== null) {
      if (!conversation) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Conversation ID is required for editing messages",
          });
      }

      // Validate editMessageIndex
      if (
        editMessageIndex < 0 ||
        editMessageIndex >= conversation.messages.length
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid message index for editing",
          });
      }

      // Ensure the message at editMessageIndex is a user message
      if (conversation.messages[editMessageIndex].role !== "user") {
        return res
          .status(400)
          .json({
            success: false,
            message: "Can only edit user messages",
          });
      }

      // Remove all messages after editMessageIndex
      conversation.messages = conversation.messages.slice(0, editMessageIndex + 1);

      // Update the message at editMessageIndex
      const userMessageContent = message
        ? message.trim()
        : images && images.length > 0
          ? `Uploaded ${images.length} image(s)`
          : files && files.length > 0
            ? `Uploaded ${files.length} file(s)`
            : "";

      conversation.messages[editMessageIndex] = {
        role: "user",
        content: userMessageContent,
        images: images && Array.isArray(images) ? images : undefined,
        files:
          files && Array.isArray(files)
            ? files.map((f: any) => ({
                url: f.url,
                name: f.name,
                type: f.type,
                size: f.size,
              }))
            : undefined,
        timestamp: new Date(),
      };
    }

    // Get user context from Brand Profile
    const userContext = {
      brandName: user.brandName,
      industry: user.industry,
      toneOfVoice: user.toneOfVoice,
      knowledgeProducts: user.knowledgeProducts,
      targetAudience: user.targetAudience,
    };

    // Build messages array for Gemini API
    const messages: ChatMessage[] = [];

    // If conversation exists, add existing messages to context
    if (conversation && conversation.messages.length > 0) {
      conversation.messages.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add current user message (if not in edit mode)
    if (editMessageIndex === undefined || editMessageIndex === null) {
      const userMessageContent = message
        ? message.trim()
        : images && images.length > 0
          ? `Uploaded ${images.length} image(s)`
          : files && files.length > 0
            ? `Uploaded ${files.length} file(s)`
            : "";
      messages.push({
        role: "user",
        content: userMessageContent,
        images: images && Array.isArray(images) ? images : undefined,
        files:
          files && Array.isArray(files)
            ? files.map((f: any) => ({
                url: f.url,
                name: f.name,
                type: f.type,
              }))
            : undefined,
      });
    }

    // Process images: read and convert to base64
    const imageData: Array<{ base64: string; mimeType: string }> = [];
    if (images && Array.isArray(images) && images.length > 0) {
      for (const imageUrl of images) {
        try {
          const imageResult = readImageAsBase64(imageUrl);
          if (imageResult.success) {
            imageData.push({
              base64: imageResult.base64,
              mimeType: imageResult.mimeType,
            });
          } else {
            console.warn(
              `Failed to read image ${imageUrl}:`,
              imageResult.error
            );
          }
        } catch (error: any) {
          console.error(`Error reading image ${imageUrl}:`, error);
        }
      }
    }

    // Process files: extract text content
    const fileTexts: Array<{ name: string; text: string }> = [];
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        try {
          const extracted = await extractTextFromFile(file.url, file.type);
          if (extracted.success && extracted.text) {
            fileTexts.push({
              name: file.name,
              text: extracted.text,
            });
          } else {
            // If extraction failed, add file info as text
            console.warn(
              `Failed to extract text from file ${file.name}:`,
              extracted.error
            );
            fileTexts.push({
              name: file.name,
              text: `[File: ${file.name}, Type: ${file.type}. Text extraction failed: ${extracted.error || "Unknown error"}]`,
            });
          }
        } catch (error: any) {
          console.error(`Error extracting text from file ${file.name}:`, error);
          fileTexts.push({
            name: file.name,
            text: `[File: ${file.name}, Type: ${file.type}. Error: ${error.message || "Unknown error"}]`,
          });
        }
      }
    }

    // Call Gemini service with images and file texts
    const aiResponse = await geminiService.generateContent(
      {
        messages,
        userContext,
      },
      imageData.length > 0 ? imageData : undefined,
      fileTexts.length > 0 ? fileTexts : undefined
    );

    // Create or update conversation
    if (!conversation) {
      // Create new conversation
      const userMessageContent = message
        ? message.trim()
        : images && images.length > 0
          ? `Uploaded ${images.length} image(s)`
          : files && files.length > 0
            ? `Uploaded ${files.length} file(s)`
            : "";
      conversation = await Conversation.create({
        userId: user._id,
        title: generateTitle(userMessageContent),
        messages: [
          {
            role: "user",
            content: userMessageContent,
            images: images && Array.isArray(images) ? images : undefined,
            files:
              files && Array.isArray(files)
                ? files.map((f: any) => ({
                    url: f.url,
                    name: f.name,
                    type: f.type,
                    size: f.size,
                  }))
                : undefined,
            timestamp: new Date(),
          },
          {
            role: "assistant",
            content: aiResponse,
            timestamp: new Date(),
          },
        ],
      });
    } else {
      // Update existing conversation
      if (editMessageIndex === undefined || editMessageIndex === null) {
        // Normal mode: append new messages
        const userMessageContent = message
          ? message.trim()
          : images && images.length > 0
            ? `Uploaded ${images.length} image(s)`
            : files && files.length > 0
              ? `Uploaded ${files.length} file(s)`
              : "";
        conversation.messages.push({
          role: "user",
          content: userMessageContent,
          images: images && Array.isArray(images) ? images : undefined,
          files:
            files && Array.isArray(files)
              ? files.map((f: any) => ({
                  url: f.url,
                  name: f.name,
                  type: f.type,
                  size: f.size,
                }))
              : undefined,
          timestamp: new Date(),
        });
      }
      // Add assistant response
      conversation.messages.push({
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      });
      await conversation.save();
    }

    res.json({
      success: true,
      response: aiResponse,
      conversationId: conversation._id.toString(),
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate response",
    });
  }
});

// @desc    Generate image
// @route   POST /api/chat/generate-image
// @access  Private
router.post(
  "/generate-image",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { prompt, conversationId } = req.body;

      // Validate prompt
      if (!prompt || !prompt.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Prompt is required" });
      }

      // Generate image
      const imageDataUrl = await generateImage(prompt.trim());

      // Extract mime type and base64 data from data URL
      const [header, base64Data] = imageDataUrl.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/png";

      // Save image to file system
      const imageUrl = await saveImage(base64Data, mimeType);

      let conversation = null;

      // If conversationId exists, add image message to conversation
      if (conversationId) {
        conversation = await Conversation.findOne({
          _id: conversationId,
          userId: user._id,
        });

        if (conversation) {
          conversation.messages.push({
            role: "assistant",
            content: `Generated image: ${prompt.trim()}`,
            images: [imageUrl],
            timestamp: new Date(),
          });
          await conversation.save();
        }
      } else {
        // Create new conversation for image
        conversation = await Conversation.create({
          userId: user._id,
          title: generateTitle(`Image: ${prompt.trim()}`),
          messages: [
            {
              role: "assistant",
              content: `Generated image: ${prompt.trim()}`,
              images: [imageUrl],
              timestamp: new Date(),
            },
          ],
        });
      }

      res.json({
        success: true,
        imageUrl,
        images: [imageUrl],
        conversationId: conversation?._id.toString(),
      });
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate image",
      });
    }
  }
);

// @desc    Get all conversations for current user
// @route   GET /api/chat
// @access  Private
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const conversations = await Conversation.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .select("title updatedAt createdAt folderId")
      .lean();

    const folders = await ProjectFolder.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .select("name updatedAt createdAt")
      .lean();

    res.json({
      success: true,
      conversations: conversations.map((conv) => ({
        id: conv._id.toString(),
        title: conv.title,
        folderId: conv.folderId ? conv.folderId.toString() : null,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      })),
      folders: folders.map((folder) => ({
        id: folder._id.toString(),
        name: folder.name,
        updatedAt: folder.updatedAt,
        createdAt: folder.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get conversations",
    });
  }
});

// @desc    Get single conversation by ID
// @route   GET /api/chat/:conversationId
// @access  Private
router.get(
  "/:conversationId",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { conversationId } = req.params;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId: user._id,
      });

      if (!conversation) {
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      }

      res.json({
        success: true,
        conversation: {
          id: conversation._id.toString(),
          title: conversation.title,
          messages: conversation.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            images: msg.images,
            files: msg.files,
            timestamp: msg.timestamp,
          })),
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });
    } catch (error: any) {
      console.error("Get conversation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get conversation",
      });
    }
  }
);

// @desc    Delete conversation 
// @route   DELETE /api/chat/:conversationId
// @access  Private
router.delete(
  "/:conversationId",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { conversationId } = req.params;

      const conversation = await Conversation.findOneAndDelete({
        _id: conversationId,
        userId: user._id,
      });

      if (!conversation) {
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      }

      res.json({
        success: true,
        message: "Conversation deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete conversation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete conversation",
      });
    }
  }
);

// @desc    Generate content plan
// @route   POST /api/chat/generate-plan
// @access  Private
router.post(
  "/generate-plan",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { goal, startDate, endDate, platforms } = req.body;

      // Validate required fields
      if (
        !goal ||
        !startDate ||
        !endDate ||
        !platforms ||
        !Array.isArray(platforms)
      ) {
        return res.status(400).json({
          success: false,
          message: "goal, startDate, endDate, and platforms array are required",
        });
      }

      // Get user context from Brand Profile
      const userContext = {
        brandName: user.brandName,
        industry: user.industry,
        toneOfVoice: user.toneOfVoice,
        knowledgeProducts: user.knowledgeProducts,
        targetAudience: user.targetAudience,
      };

      // Generate content plan
      const plan = await generateContentPlan({
        userContext,
        goal,
        startDate,
        endDate,
        platforms,
      });

      res.json({
        success: true,
        plan,
      });
    } catch (error: any) {
      console.error("Generate content plan error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate content plan",
      });
    }
  }
);

// @desc    Send content plan to calendar
// @route   POST /api/chat/send-to-calendar
// @access  Private
router.post(
  "/send-to-calendar",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { items, campaignId } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "items array is required and must not be empty",
        });
      }

      // Validate and create calendar items
      const itemsToCreate = items.map((item: any) => ({
        userId: user._id,
        campaignId: campaignId || null,
        platform: item.platform,
        date: new Date(item.date),
        time: item.time || null,
        title: item.title,
        content: item.content,
        variants: item.variants || {},
        status: item.status || "draft",
      }));

      const createdItems = await CalendarItem.insertMany(itemsToCreate);

      res.status(201).json({
        success: true,
        items: createdItems.map((item) => ({
          id: item._id.toString(),
          userId: item.userId.toString(),
          campaignId: item.campaignId ? item.campaignId.toString() : null,
          platform: item.platform,
          date: item.date.toISOString().split("T")[0],
          time: item.time || null,
          title: item.title,
          content: item.content,
          variants: item.variants || {},
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        count: createdItems.length,
      });
    } catch (error: any) {
      console.error("Send to calendar error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send items to calendar",
      });
    }
  }
);

// @desc    Create project folder
// @route   POST /api/chat/folders
// @access  Private
router.post("/folders", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Folder name is required" });
    }

    const folder = await ProjectFolder.create({
      userId: user._id,
      name: name.trim(),
    });

    res.json({
      success: true,
      folder: {
        id: folder._id.toString(),
        name: folder.name,
        updatedAt: folder.updatedAt,
        createdAt: folder.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Create folder error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create folder",
    });
  }
});

// @desc    Update project folder name
// @route   PUT /api/chat/folders/:folderId
// @access  Private
router.put(
  "/folders/:folderId",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { folderId } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Folder name is required" });
      }

      const folder = await ProjectFolder.findOneAndUpdate(
        { _id: folderId, userId: user._id },
        { name: name.trim() },
        { new: true }
      );

      if (!folder) {
        return res
          .status(404)
          .json({ success: false, message: "Folder not found" });
      }

      res.json({
        success: true,
        folder: {
          id: folder._id.toString(),
          name: folder.name,
          updatedAt: folder.updatedAt,
          createdAt: folder.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Update folder error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update folder",
      });
    }
  }
);

// @desc    Delete project folder
// @route   DELETE /api/chat/folders/:folderId
// @access  Private
router.delete(
  "/folders/:folderId",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { folderId } = req.params;

      // Remove folderId from all conversations in this folder
      await Conversation.updateMany(
        { folderId: folderId, userId: user._id },
        { $set: { folderId: null } }
      );

      // Delete the folder
      const folder = await ProjectFolder.findOneAndDelete({
        _id: folderId,
        userId: user._id,
      });

      if (!folder) {
        return res
          .status(404)
          .json({ success: false, message: "Folder not found" });
      }

      res.json({
        success: true,
        message: "Folder deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete folder error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete folder",
      });
    }
  }
);

// @desc    Update conversation title
// @route   PUT /api/chat/:conversationId/title
// @access  Private
router.put(
  "/:conversationId/title",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { conversationId } = req.params;
      const { title } = req.body;

      if (!title || !title.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Title is required" });
      }

      const conversation = await Conversation.findOneAndUpdate(
        { _id: conversationId, userId: user._id },
        { title: title.trim() },
        { new: true }
      );

      if (!conversation) {
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      }

      res.json({
        success: true,
        conversation: {
          id: conversation._id.toString(),
          title: conversation.title,
          folderId: conversation.folderId
            ? conversation.folderId.toString()
            : null,
          updatedAt: conversation.updatedAt,
          createdAt: conversation.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Update conversation title error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update conversation title",
      });
    }
  }
);

// @desc    Move conversation to folder
// @route   PUT /api/chat/:conversationId/folder
// @access  Private
router.put(
  "/:conversationId/folder",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user;

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const { conversationId } = req.params;
      const { folderId } = req.body;

      // Validate folderId if provided
      if (folderId) {
        const folder = await ProjectFolder.findOne({
          _id: folderId,
          userId: user._id,
        });

        if (!folder) {
          return res
            .status(404)
            .json({ success: false, message: "Folder not found" });
        }
      }

      const conversation = await Conversation.findOneAndUpdate(
        { _id: conversationId, userId: user._id },
        { folderId: folderId || null },
        { new: true }
      );

      if (!conversation) {
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      }

      res.json({
        success: true,
        conversation: {
          id: conversation._id.toString(),
          title: conversation.title,
          folderId: conversation.folderId
            ? conversation.folderId.toString()
            : null,
          updatedAt: conversation.updatedAt,
          createdAt: conversation.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Move conversation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to move conversation",
      });
    }
  }
);

export default router;
