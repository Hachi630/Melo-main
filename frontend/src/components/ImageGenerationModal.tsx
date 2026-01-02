import { Modal, Input, Button, message } from "antd";
import { useState } from "react";
import { chatService } from "../services/chatService";

const { TextArea } = Input;

interface ImageGenerationModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (imageUrl: string, conversationId?: string) => void;
  conversationId?: string | null;
}

export default function ImageGenerationModal({
  open,
  onCancel,
  onSuccess,
  conversationId,
}: ImageGenerationModalProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning("Please enter image description");
      return;
    }

    setLoading(true);
    try {
      const response = await chatService.generateImage(
        prompt.trim(),
        conversationId || undefined
      );

      if (response.success && response.imageUrl) {
        message.success("Image generated successfully");
        onSuccess(response.imageUrl, response.conversationId);
        setPrompt("");
        onCancel();
      } else {
        message.error(response.message || "Failed to generate image");
      }
    } catch {
      message.error("Failed to generate image, please try again later");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPrompt("");
    onCancel();
  };

  return (
    <Modal
      title="Generate Image"
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="generate"
          type="primary"
          loading={loading}
          onClick={handleGenerate}
        >
          Generate
        </Button>,
      ]}
    >
      <div style={{ marginTop: 16 }}>
        <TextArea
          placeholder="Please enter image description, e.g., a cute little rabbit on the grass"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 6 }}
          disabled={loading}
          onPressEnter={(e) => {
            if (e.ctrlKey || e.metaKey) {
              handleGenerate();
            }
          }}
        />
        <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
          Tip: Press Ctrl+Enter or Cmd+Enter to generate quickly
        </div>
      </div>
    </Modal>
  );
}
