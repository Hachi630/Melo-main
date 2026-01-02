import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  MessageOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Input,
  Typography,
  Spin,
  Modal,
  message,
  Dropdown,
} from "antd";
import type { InputRef, MenuProps } from "antd";
import { useState, useEffect, useRef } from "react";
import styles from "./Sidebar.module.css";
import { User } from "../services/authService";
import {
  chatService,
  ConversationListItem,
  ProjectFolder,
} from "../services/chatService";

interface SidebarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  user?: User | null;
  selectedConversationId?: string | null;
  onConversationSelect?: (conversationId: string | null) => void;
  onNewConversation?: () => void;
  conversationsUpdateTrigger?: number;
}

export default function Sidebar({
  collapsed,
  onToggleSidebar,
  user,
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
  conversationsUpdateTrigger,
}: SidebarProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    []
  );
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [editingItem, setEditingItem] = useState<{
    type: "folder" | "conversation";
    id: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [draggedItem, setDraggedItem] = useState<{
    type: "conversation";
    id: string;
  } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [folderSearchKeyword, setFolderSearchKeyword] = useState<string>("");
  const [folderSearchResults, setFolderSearchResults] = useState<
    ProjectFolder[]
  >([]);
  const [folderSearchVisible, setFolderSearchVisible] = useState(false);
  const [folderSearchConversationId, setFolderSearchConversationId] = useState<
    string | null
  >(null);
  const editInputRef = useRef<InputRef>(null);

  const loadData = async () => {
    if (!user) {
      setConversations([]);
      setFolders([]);
      setFolderSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const result = await chatService.getConversations();
      if (result.success) {
        setConversations(result.conversations || []);
        setFolders(result.folders || []);
        setFolderSearchResults(result.folders || []);
        // Expand all folders by default
        if (result.folders) {
          setExpandedFolders(new Set(result.folders.map((f) => f.id)));
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, conversationsUpdateTrigger]);

  useEffect(() => {
    setFolderSearchResults(folders);
  }, [folders]);

  useEffect(() => {
    if (editingItem && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItem]);

  const handleConversationClick = (conversationId: string) => {
    if (onConversationSelect) {
      onConversationSelect(conversationId);
    }
  };

  const handleNewChat = () => {
    if (onNewConversation) {
      onNewConversation();
    }
    if (onConversationSelect) {
      onConversationSelect(null);
    }
  };

  const handleCreateFolder = async () => {
    let modalInstance: ReturnType<typeof Modal.confirm> | null = null;
    let inputValue = "";

    const handleConfirm = async () => {
      if (!inputValue.trim()) {
        return;
      }

      try {
        const result = await chatService.createFolder(inputValue.trim());
        if (result.success) {
          message.success("Folder created successfully");
          if (modalInstance) {
            modalInstance.destroy();
          }
          await loadData();
        } else {
          message.error(result.message || "Failed to create folder");
        }
      } catch {
        message.error("An error occurred while creating folder");
      }
    };

    modalInstance = Modal.confirm({
      title: "Create New Folder",
      content: (
        <Input
          placeholder="Folder name"
          autoFocus
          onChange={(e) => {
            inputValue = e.target.value;
          }}
          onPressEnter={async (e) => {
            const target = e.target as HTMLInputElement;
            inputValue = target.value;
            if (inputValue.trim()) {
              await handleConfirm();
            }
          }}
        />
      ),
      okText: "Create",
      cancelText: "Cancel",
      onOk: async () => {
        const input = document.querySelector(
          ".ant-modal-content input"
        ) as HTMLInputElement;
        if (input && input.value.trim()) {
          inputValue = input.value;
          await handleConfirm();
        }
      },
    });
  };

  const handleRenameStart = (
    type: "folder" | "conversation",
    id: string,
    currentName: string
  ) => {
    setEditingItem({ type, id });
    setEditingValue(currentName);
  };

  const handleRenameConfirm = async () => {
    if (!editingItem || !editingValue.trim()) {
      setEditingItem(null);
      return;
    }

    try {
      if (editingItem.type === "folder") {
        const result = await chatService.updateFolderName(
          editingItem.id,
          editingValue.trim()
        );
        if (result.success) {
          message.success("Folder renamed successfully");
          await loadData();
        } else {
          message.error(result.message || "Failed to rename folder");
        }
      } else {
        const result = await chatService.updateConversationTitle(
          editingItem.id,
          editingValue.trim()
        );
        if (result.success) {
          message.success("Conversation renamed successfully");
          await loadData();
        } else {
          message.error(result.message || "Failed to rename conversation");
        }
      }
    } catch {
      message.error("An error occurred while renaming");
    } finally {
      setEditingItem(null);
      setEditingValue("");
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, conversationId: string) => {
    setDraggedItem({ type: "conversation", id: conversationId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetFolderId: string | null
  ) => {
    e.preventDefault();
    setDragOverFolder(null);

    if (draggedItem && draggedItem.type === "conversation") {
      try {
        const result = await chatService.moveConversationToFolder(
          draggedItem.id,
          targetFolderId
        );
        if (result.success) {
          message.success("Conversation moved successfully");
          await loadData();
        } else {
          message.error(result.message || "Failed to move conversation");
        }
      } catch {
        message.error("An error occurred while moving conversation");
      }
    }

    setDraggedItem(null);
  };

  // Organize conversations by folder
  const conversationsByFolder = new Map<string, ConversationListItem[]>();
  const rootConversations: ConversationListItem[] = [];

  conversations.forEach((conv) => {
    if (conv.folderId) {
      if (!conversationsByFolder.has(conv.folderId)) {
        conversationsByFolder.set(conv.folderId, []);
      }
      conversationsByFolder.get(conv.folderId)!.push(conv);
    } else {
      rootConversations.push(conv);
    }
  });

  // Filter based on search
  const filterItems = <T extends ConversationListItem | ProjectFolder>(
    items: T[]
  ): T[] => {
    if (!searchKeyword.trim()) {
      return items;
    }
    const keyword = searchKeyword.toLowerCase().trim();
    return items.filter((item) => {
      const name =
        "title" in item
          ? (item as ConversationListItem).title
          : (item as ProjectFolder).name;
      return name.toLowerCase().includes(keyword);
    });
  };

  const filteredFolders = filterItems(folders) as ProjectFolder[];
  const filteredRootConversations = filterItems(
    rootConversations
  ) as ConversationListItem[];

  const handleOpenFolderSearch = (conversationId: string) => {
    setFolderSearchConversationId(conversationId);
    setFolderSearchKeyword("");
    setFolderSearchResults(folders);
    setFolderSearchVisible(true);
  };

  const handleFolderSearchChange = (value: string) => {
    setFolderSearchKeyword(value);
    const keyword = value.trim().toLowerCase();
    if (!keyword) {
      setFolderSearchResults(folders);
      return;
    }
    const matched = folders.filter((folder) =>
      folder.name.toLowerCase().includes(keyword)
    );
    const unmatched = folders.filter(
      (folder) => !folder.name.toLowerCase().includes(keyword)
    );
    setFolderSearchResults([...matched, ...unmatched]);
  };

  const handleMoveFromSearch = async (folderId: string) => {
    if (!folderSearchConversationId) return;
    try {
      const result = await chatService.moveConversationToFolder(
        folderSearchConversationId,
        folderId
      );
      if (result.success) {
        message.success("Conversation moved successfully");
        setFolderSearchVisible(false);
        await loadData();
      } else {
        message.error(result.message || "Failed to move conversation");
      }
    } catch {
      message.error("An error occurred while moving conversation");
    }
  };

  // Create menu for conversation
  const createConversationMenu = (
    conversationId: string,
    conversationTitle: string
  ): MenuProps => {
    const recentFolders = folders.slice(0, 5).map((folder) => ({
      key: `move-${folder.id}`,
      label: folder.name,
      onClick: async () => {
        try {
          const result = await chatService.moveConversationToFolder(
            conversationId,
            folder.id
          );
          if (result.success) {
            message.success("Conversation moved successfully");
            await loadData();
          } else {
            message.error(result.message || "Failed to move conversation");
          }
        } catch {
          message.error("An error occurred while moving conversation");
        }
      },
    }));

    const items: MenuProps["items"] = [
      {
        key: "rename",
        label: "Rename",
        icon: <EditOutlined />,
        onClick: () => {
          handleRenameStart("conversation", conversationId, conversationTitle);
        },
      },
      {
        key: "move",
        label: "Move to folder",
        icon: <FolderOutlined />,
        children: [
          ...recentFolders,
          {
            type: "divider",
          },
          {
            key: "search-folders",
            label: "Search for...",
            onClick: () => handleOpenFolderSearch(conversationId),
          },
        ],
      },
      {
        key: "remove",
        label: "Remove from folder",
        onClick: async () => {
          try {
            const result = await chatService.moveConversationToFolder(
              conversationId,
              null
            );
            if (result.success) {
              message.success("Conversation moved to root");
              await loadData();
            } else {
              message.error(result.message || "Failed to move conversation");
            }
          } catch {
            message.error("An error occurred while moving conversation");
          }
        },
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: "Delete Conversation",
            content:
              "Are you sure you want to delete this conversation? This action cannot be undone.",
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: async () => {
              try {
                const result =
                  await chatService.deleteConversation(conversationId);
                if (result.success) {
                  message.success("Conversation deleted successfully");
                  await loadData();
                  if (
                    selectedConversationId === conversationId &&
                    onConversationSelect
                  ) {
                    onConversationSelect(null);
                  }
                } else {
                  message.error(
                    result.message || "Failed to delete conversation"
                  );
                }
              } catch {
                message.error(
                  "An error occurred while deleting the conversation"
                );
              }
            },
          });
        },
      },
    ];

    return { items };
  };

  // Create menu for folder
  const createFolderMenu = (
    folderId: string,
    folderName: string
  ): MenuProps => {
    const items: MenuProps["items"] = [
      {
        key: "rename",
        label: "Rename",
        icon: <EditOutlined />,
        onClick: () => {
          handleRenameStart("folder", folderId, folderName);
        },
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: "Delete Folder",
            content:
              "Are you sure you want to delete this folder? Conversations in this folder will be moved to the root.",
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: async () => {
              try {
                const result = await chatService.deleteFolder(folderId);
                if (result.success) {
                  message.success("Folder deleted successfully");
                  await loadData();
                } else {
                  message.error(result.message || "Failed to delete folder");
                }
              } catch {
                message.error("An error occurred while deleting the folder");
              }
            },
          });
        },
      },
    ];

    return { items };
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}
    >
      <div className={styles.topSection}>
        <div className={styles.header}>
          <Button
            shape="circle"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={onToggleSidebar}
            className={styles.menuButton}
          />
          {!collapsed && (
            <>
              <Typography.Title level={5} className={styles.title}>
                Flippy chats
              </Typography.Title>
              <div className={styles.headerActions}>
                <Button
                  type="text"
                  icon={<SearchOutlined />}
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={styles.searchIconButton}
                />
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={handleNewChat}
                  className={styles.newChatButton}
                />
              </div>
            </>
          )}
        </div>
        {!collapsed && (
          <>
            {isSearchOpen && (
              <Input
                className={styles.searchInput}
                placeholder="Search"
                prefix={<SearchOutlined />}
                allowClear
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                autoFocus
                onPressEnter={() => {}}
                onBlur={() => {
                  if (!searchKeyword.trim()) {
                    setTimeout(() => {
                      setIsSearchOpen(false);
                    }, 150);
                  }
                }}
              />
            )}
            <div className={styles.chatsSection}>
              <div className={styles.sectionHeader}>
                <Typography.Text
                  type="secondary"
                  className={styles.sectionTitle}
                >
                  Chats
                </Typography.Text>
                <Button
                  type="text"
                  size="small"
                  icon={<FolderOutlined />}
                  onClick={handleCreateFolder}
                  className={styles.newFolderButton}
                  title="New Folder"
                />
              </div>
              {loading ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <Spin size="small" />
                </div>
              ) : (
                <>
                  {/* Folders */}
                  {filteredFolders.map((folder) => {
                    const folderConversations =
                      conversationsByFolder.get(folder.id) || [];
                    const isExpanded = expandedFolders.has(folder.id);
                    const isDragOver = dragOverFolder === folder.id;

                    return (
                      <div key={folder.id} className={styles.folderContainer}>
                        <div
                          className={`${styles.folderItem} ${isDragOver ? styles.folderDragOver : ""}`}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, folder.id)}
                        >
                          <div
                            className={styles.folderHeader}
                            onClick={() => toggleFolder(folder.id)}
                          >
                            {isExpanded ? (
                              <FolderOpenOutlined
                                className={styles.folderIcon}
                              />
                            ) : (
                              <FolderOutlined className={styles.folderIcon} />
                            )}
                            {editingItem?.type === "folder" &&
                            editingItem.id === folder.id ? (
                              <Input
                                ref={editInputRef}
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                onPressEnter={handleRenameConfirm}
                                onBlur={handleRenameConfirm}
                                onClick={(e) => e.stopPropagation()}
                                className={styles.renameInput}
                              />
                            ) : (
                              <Typography.Text
                                ellipsis
                                className={styles.folderName}
                              >
                                {folder.name}
                              </Typography.Text>
                            )}
                          </div>
                          <Dropdown
                            menu={createFolderMenu(folder.id, folder.name)}
                            trigger={["click", "contextMenu"]}
                            placement="bottomRight"
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<MoreOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className={styles.moreButton}
                            />
                          </Dropdown>
                        </div>
                        {isExpanded && (
                          <div className={styles.folderContent}>
                            {filterItems(folderConversations).map((conv) => (
                              <div
                                key={conv.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, conv.id)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className={`${styles.chatItem} ${styles.chatItemRow} ${
                                  selectedConversationId === conv.id
                                    ? styles.chatItemActive
                                    : ""
                                }`}
                                onClick={() => handleConversationClick(conv.id)}
                              >
                                <div className={styles.chatItemContent}>
                                  <MessageOutlined
                                    className={styles.chatIcon}
                                  />
                                  {editingItem?.type === "conversation" &&
                                  editingItem.id === conv.id ? (
                                    <Input
                                      ref={editInputRef}
                                      value={editingValue}
                                      onChange={(e) =>
                                        setEditingValue(e.target.value)
                                      }
                                      onPressEnter={handleRenameConfirm}
                                      onBlur={handleRenameConfirm}
                                      onClick={(e) => e.stopPropagation()}
                                      className={styles.renameInput}
                                    />
                                  ) : (
                                    <Typography.Text
                                      ellipsis
                                      className={styles.chatTitle}
                                    >
                                      {conv.title}
                                    </Typography.Text>
                                  )}
                                </div>
                                <Dropdown
                                  menu={createConversationMenu(
                                    conv.id,
                                    conv.title
                                  )}
                                  trigger={["click", "contextMenu"]}
                                  placement="bottomRight"
                                >
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<MoreOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    className={styles.moreButton}
                                  />
                                </Dropdown>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Root conversations (no folder) */}
                  <div
                    className={`${styles.rootDropZone} ${draggedItem && dragOverFolder === null ? styles.rootDropZoneDragOver : ""}`}
                    onDragOver={(e) => handleDragOver(e, null)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, null)}
                  >
                    {filteredRootConversations.map((conv) => (
                      <div
                        key={conv.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, conv.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className={`${styles.chatItem} ${styles.chatItemRow} ${
                          selectedConversationId === conv.id
                            ? styles.chatItemActive
                            : ""
                        }`}
                        onClick={() => handleConversationClick(conv.id)}
                      >
                        <div className={styles.chatItemContent}>
                          <MessageOutlined className={styles.chatIcon} />
                          {editingItem?.type === "conversation" &&
                          editingItem.id === conv.id ? (
                            <Input
                              ref={editInputRef}
                              value={editingValue}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => setEditingValue(e.target.value)}
                              onPressEnter={handleRenameConfirm}
                              onBlur={handleRenameConfirm}
                              onClick={(e: React.MouseEvent) =>
                                e.stopPropagation()
                              }
                              className={styles.renameInput}
                            />
                          ) : (
                            <Typography.Text
                              ellipsis
                              className={styles.chatTitle}
                            >
                              {conv.title}
                            </Typography.Text>
                          )}
                        </div>
                        <Dropdown
                          menu={createConversationMenu(conv.id, conv.title)}
                          trigger={["click", "contextMenu"]}
                          placement="bottomRight"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className={styles.moreButton}
                          />
                        </Dropdown>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className={styles.userSection}>
        <Avatar
          size={36}
          src={user?.avatar}
          style={{ backgroundColor: "#87d068" }}
        >
          {user?.name
            ? user.name[0].toUpperCase()
            : user?.email
              ? user.email[0].toUpperCase()
              : "G"}
        </Avatar>
        {!collapsed && (
          <div className={styles.userInfo}>
            <Typography.Text className={styles.userName} ellipsis>
              {user?.name || user?.brandName || "Melo User"}
            </Typography.Text>
            {user?.email && (
              <Typography.Text className={styles.userEmail} ellipsis>
                {user.email}
              </Typography.Text>
            )}
          </div>
        )}
      </div>

      <Modal
        open={folderSearchVisible}
        title="Search folders"
        onCancel={() => setFolderSearchVisible(false)}
        footer={null}
        destroyOnClose
      >
        <div className={styles.folderSearchModal}>
          <Input
            placeholder="Type to search folders"
            autoFocus
            value={folderSearchKeyword}
            onChange={(e) => handleFolderSearchChange(e.target.value)}
            onPressEnter={() => {
              if (folderSearchResults[0]) {
                handleMoveFromSearch(folderSearchResults[0].id);
              }
            }}
          />
          <div className={styles.folderSearchList}>
            {folderSearchResults.length === 0 ? (
              <Typography.Text type="secondary">
                No folders found
              </Typography.Text>
            ) : (
              folderSearchResults.map((folder) => (
                <Button
                  key={folder.id}
                  type="text"
                  block
                  onClick={() => handleMoveFromSearch(folder.id)}
                  className={`${styles.folderSearchItem} ${
                    folderSearchKeyword.trim() &&
                    folder.name
                      .toLowerCase()
                      .includes(folderSearchKeyword.trim().toLowerCase())
                      ? styles.folderSearchItemHighlight
                      : ""
                  }`}
                >
                  {folder.name}
                </Button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </aside>
  );
}
