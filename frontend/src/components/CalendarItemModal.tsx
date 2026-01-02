import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Space,
  Tabs,
  message,
  Descriptions,
  Tag,
  Typography,
  Dropdown,
  Upload,
  App,
} from 'antd'
import { EditOutlined, ShareAltOutlined, UploadOutlined, DeleteOutlined, PictureOutlined, RobotOutlined } from '@ant-design/icons'
import type { MenuProps, UploadProps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useEffect, useState } from 'react'
import { CalendarItem, calendarService } from '../services/calendarService'
import { Campaign, campaignService } from '../services/campaignService'
import { uploadService } from '../services/uploadService'
import { chatService } from '../services/chatService'
import ImageGenerationModal from './ImageGenerationModal'
import styles from './CalendarItemModal.module.css'

const { Text } = Typography

const { TextArea } = Input
const { Option } = Select

export const PLATFORMS = {
  INSTAGRAM_POST: 'instagram_post',
  INSTAGRAM_STORY: 'instagram_story',
  INSTAGRAM_REELS: 'instagram_reels',
  TIKTOK: 'tiktok',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
  LINKEDIN: 'linkedin',
} as const

const platformOptions = [
  { value: PLATFORMS.INSTAGRAM_POST, label: 'Instagram Post' },
  { value: PLATFORMS.INSTAGRAM_STORY, label: 'Instagram Story' },
  { value: PLATFORMS.INSTAGRAM_REELS, label: 'Instagram Reels' },
  { value: PLATFORMS.TIKTOK, label: 'TikTok' },
  { value: PLATFORMS.FACEBOOK, label: 'Facebook' },
  { value: PLATFORMS.TWITTER, label: 'Twitter/X' },
  { value: PLATFORMS.LINKEDIN, label: 'LinkedIn' },
]

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
]

interface CalendarItemModalProps {
  open: boolean
  item?: CalendarItem | null
  defaultDate?: Dayjs
  defaultTime?: string
  onClose: () => void
  onSave: () => void
}

export default function CalendarItemModal({
  open,
  item,
  defaultDate,
  defaultTime,
  onClose,
  onSave,
}: CalendarItemModalProps) {
  const { modal } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activePlatformTab, setActivePlatformTab] = useState<string>('main')
  const [isEditing, setIsEditing] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageGenModalOpen, setImageGenModalOpen] = useState(false)

  const isEditMode = !!item
  const isPreviewMode = isEditMode && !isEditing

  useEffect(() => {
    if (open) {
      loadCampaigns()
      if (item) {
        // Edit mode: populate form with item data
        form.setFieldsValue({
          platform: item.platform,
          date: dayjs(item.date),
          time: item.time ? dayjs(item.time, 'HH:mm') : null,
          title: item.title,
          content: item.content,
          status: item.status,
          campaignId: item.campaignId || undefined,
          variants: item.variants || {},
        })
        setImageUrl(item.imageUrl || null)
        // Set active tab to main platform
        setActivePlatformTab(item.platform)
        // Preview mode by default for existing items
        setIsEditing(false)
      } else {
        // Create mode: set defaults
        form.setFieldsValue({
          platform: PLATFORMS.INSTAGRAM_POST,
          date: defaultDate || dayjs(),
          time: defaultTime ? dayjs(defaultTime, 'HH:mm') : null,
          title: '',
          content: '',
          status: 'draft',
          campaignId: undefined,
          variants: {},
        })
        setImageUrl(null)
        setActivePlatformTab(PLATFORMS.INSTAGRAM_POST)
        // Create mode: always in editing state
        setIsEditing(true)
      }
    }
  }, [open, item, defaultDate, defaultTime, form])

  const loadCampaigns = async () => {
    const response = await campaignService.getCampaigns()
    if (response.success && response.campaigns) {
      setCampaigns(response.campaigns)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // Get current selected company ID from localStorage
      let companyId: string | null = null
      try {
        const savedSelectedId = localStorage.getItem("melo_selected_company")
        if (savedSelectedId) {
          companyId = savedSelectedId
          console.log("Saving calendar item with companyId:", companyId)
        } else {
          console.warn("No selected company found in localStorage")
        }
      } catch (error) {
        console.error("Error getting selected company:", error)
      }

      const formData = {
        platform: values.platform,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time ? values.time.format('HH:mm') : null,
        title: values.title,
        content: values.content,
        imageUrl: imageUrl || null,
        status: values.status,
        campaignId: values.campaignId || null,
        companyId: companyId,
        variants: {
          ...(values.variants || {}),
        },
      }

      if (isEditMode && item) {
        // Update existing item
        const response = await calendarService.updateCalendarItem(item.id, formData)
        if (response.success) {
          message.success('Calendar item updated successfully')
          onSave()
          onClose()
        } else {
          message.error(response.message || 'Failed to update calendar item')
        }
      } else {
        // Create new item
        const response = await calendarService.createCalendarItem(formData)
        if (response.success) {
          message.success('Calendar item created successfully')
          onSave()
          onClose()
        } else {
          message.error(response.message || 'Failed to create calendar item')
        }
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return

    modal.confirm({
      title: 'Delete Calendar Item',
      content: 'Are you sure you want to delete this calendar item?',
      onOk: async () => {
        setLoading(true)
        const response = await calendarService.deleteCalendarItem(item.id)
        if (response.success) {
          message.success('Calendar item deleted successfully')
          onSave()
          onClose()
        } else {
          message.error(response.message || 'Failed to delete calendar item')
        }
        setLoading(false)
      },
    })
  }

  const handleClose = () => {
    form.resetFields()
    setIsEditing(false)
    onClose()
  }

  const handleShare = async (platform: string) => {
    if (!item) {
      message.error('No item to share')
      return
    }

    try {
      setLoading(true)
      
      // Use calendar share endpoint for Twitter
      if (platform === 'twitter') {
        message.info('Sharing to Twitter/X...')
        const response = await calendarService.shareCalendarItem(item.id, platform)
        if (response.success) {
          message.success('Successfully posted to Twitter/X!')
        } else {
          message.error(response.message || 'Failed to post to Twitter/X')
        }
        return
      }
      
      // Use social API for Instagram and Facebook
      if (platform === 'instagram' || platform === 'facebook') {
        message.info(`Sharing to ${platform}...`)
        
        const token = localStorage.getItem('token')
        if (!token) {
          message.error('Not authenticated')
          return
        }

        try {
          const response = await fetch(`/api/${platform}/share`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              calendarItemId: item.id,
              content: item.content,
              imageUrl: item.imageUrl,
            }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            message.success(`Successfully shared to ${platform}!`)
            onSave() // Refresh the calendar
          } else {
            if (data.requiresAuth) {
              // Show modal to connect account
              modal.confirm({
                title: `Connect ${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`,
                content: data.message || `You need to connect your ${platform} account before sharing. Would you like to connect it now?`,
                okText: 'Connect Now',
                cancelText: 'Cancel',
                onOk: () => {
                  if (platform === 'instagram' || platform === 'facebook') {
                    // Redirect to Social Dashboard to connect
                    window.location.href = '/socialdashboard'
                  }
                },
              })
            } else {
              message.error(data.message || `Failed to share to ${platform}`)
            }
          }
        } catch (error) {
          console.error('Share error:', error)
          message.error(`Failed to share to ${platform}`)
        }
        return
      }
      
      // For other platforms, show coming soon
      message.info(`Sharing to ${platform}... (Coming soon)`)
    } catch (error) {
      console.error('Share error:', error)
      message.error(`Failed to share to ${platform}`)
    } finally {
      setLoading(false)
    }
  }

  const shareMenuItems: MenuProps['items'] = [
    {
      key: 'instagram',
      label: 'Instagram',
      icon: <span>📷</span>,
      onClick: () => handleShare('instagram'),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <span>👥</span>,
      onClick: () => handleShare('facebook'),
    },
    {
      key: 'twitter',
      label: 'Twitter/X',
      icon: <span>🐦</span>,
      onClick: () => handleShare('twitter'),
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <span>💼</span>,
      onClick: () => handleShare('linkedin'),
    },
  ]

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (item) {
      // Reset form to original values
      form.setFieldsValue({
        platform: item.platform,
        date: dayjs(item.date),
        time: item.time ? dayjs(item.time, 'HH:mm') : null,
        title: item.title,
        content: item.content,
        status: item.status,
        campaignId: item.campaignId || undefined,
        variants: item.variants || {},
      })
      setImageUrl(item.imageUrl || null)
      setActivePlatformTab(item.platform)
    }
    setIsEditing(false)
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const response = await uploadService.uploadImage(file)
      if (response.success && response.imageUrl) {
        setImageUrl(response.imageUrl)
        message.success('Image uploaded successfully')
      } else {
        message.error(response.message || 'Failed to upload image')
      }
    } catch (error) {
      message.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }


  const handleFileSelect: UploadProps['onChange'] = (info) => {
    const file = info.file.originFileObj || (info.file as any).originFileObj || info.file
    if (file && file instanceof File) {
      // Validate file type
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        message.error('Only image files are allowed')
        return
      }
      // Validate file size (10MB)
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        message.error('Image must be smaller than 10MB')
        return
      }
      // Use file upload method
      handleImageUpload(file)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl(null)
    message.success('Image removed')
  }

  const handleAIGenerateImage = () => {
    setImageGenModalOpen(true)
  }

  const handleAIGenerateImageAuto = async () => {
    const content = form.getFieldValue('content')
    if (!content || !content.trim()) {
      message.warning('Please enter content first to generate image automatically')
      return
    }

    setUploadingImage(true)
    try {
      // Generate prompt from content
      const prompt = `Create a professional social media image for: ${content.substring(0, 200)}`
      const response = await chatService.generateImage(prompt)
      if (response.success && response.imageUrl) {
        setImageUrl(response.imageUrl)
        message.success('Image generated successfully')
      } else {
        message.error(response.message || 'Failed to generate image')
      }
    } catch (error) {
      message.error('Failed to generate image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageGenSuccess = (url: string) => {
    setImageUrl(url)
    setImageGenModalOpen(false)
  }

  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    return url
  }

  const getPlatformLabel = (platform: string) => {
    return platformOptions.find((opt) => opt.value === platform)?.label || platform
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default'
      case 'scheduled':
        return 'processing'
      case 'published':
        return 'success'
      default:
        return 'default'
    }
  }

  const platformTabs = [
    { key: 'main', label: 'Main Content' },
    ...platformOptions.map((p) => ({ key: p.value, label: p.label })),
  ]

  return (
    <Modal
      title={isEditMode ? (isPreviewMode ? 'Calendar Item Details' : 'Edit Calendar Item') : 'Create Calendar Item'}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      className={styles.modal}
    >
      {isPreviewMode && item ? (
        // Preview Mode
        <div className={styles.previewMode}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Platform">
              <Tag color="blue">{getPlatformLabel(item.platform)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Date">
              {item.date}
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              {item.time || 'Not set'}
            </Descriptions.Item>
            <Descriptions.Item label="Title">
              <Text strong>{item.title}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Content">
              <div className={styles.contentPreview}>{item.content}</div>
            </Descriptions.Item>
            {item.imageUrl && (
              <Descriptions.Item label="Image">
                <div className={styles.imagePreview}>
                  <img src={getImageUrl(item.imageUrl)} alt="Calendar item" />
                </div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(item.status)}>{item.status.toUpperCase()}</Tag>
            </Descriptions.Item>
            {item.campaignName && (
              <Descriptions.Item label="Campaign">
                {item.campaignName}
              </Descriptions.Item>
            )}
            {item.variants && Object.keys(item.variants).length > 0 && (
              <Descriptions.Item label="Platform Variants">
                <Tabs
                  size="small"
                  items={Object.entries(item.variants).map(([platform, content]) => ({
                    key: platform,
                    label: getPlatformLabel(platform),
                    children: <div className={styles.contentPreview}>{content}</div>,
                  }))}
                />
              </Descriptions.Item>
            )}
          </Descriptions>
          <div className={styles.previewActions}>
            <Space>
              <Button danger onClick={handleDelete} loading={loading}>
                Delete
              </Button>
              <Button onClick={handleClose}>Close</Button>
              <Dropdown menu={{ items: shareMenuItems }} trigger={['click']}>
                <Button icon={<ShareAltOutlined />} loading={loading}>
                  Share
                </Button>
              </Dropdown>
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                Edit
              </Button>
            </Space>
          </div>
        </div>
      ) : (
        // Edit Mode
        <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item
          name="platform"
          label="Platform"
          rules={[{ required: true, message: 'Please select a platform' }]}
        >
          <Select placeholder="Select platform" onChange={(value) => setActivePlatformTab(value)}>
            {platformOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Space orientation="horizontal" size="middle" style={{ width: '100%' }}>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
            style={{ flex: 1 }}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="time" label="Time" style={{ flex: 1 }}>
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>
        </Space>

        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="Short title for calendar display" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="content"
          label="Content"
          rules={[{ required: true, message: 'Please enter content' }]}
        >
          <TextArea
            rows={6}
            placeholder="Full content text"
            showCount
            maxLength={2000}
          />
        </Form.Item>

        <Form.Item label="Image">
          <div className={styles.imageContainer}>
            {imageUrl ? (
              <div className={styles.imagePreview}>
                <img src={getImageUrl(imageUrl)} alt="Preview" />
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  size="small"
                  onClick={handleRemoveImage}
                  className={styles.removeImageBtn}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className={styles.imageUploadArea}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={handleFileSelect}
                    disabled={uploadingImage}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      loading={uploadingImage}
                      block
                    >
                      Upload Image
                    </Button>
                  </Upload>
                  <Space style={{ width: '100%', justifyContent: 'center' }}>
                    <Button
                      icon={<RobotOutlined />}
                      onClick={handleAIGenerateImage}
                      disabled={uploadingImage}
                    >
                      AI Generate (Manual)
                    </Button>
                    <Button
                      icon={<PictureOutlined />}
                      onClick={handleAIGenerateImageAuto}
                      disabled={uploadingImage || !form.getFieldValue('content')}
                      loading={uploadingImage}
                    >
                      AI Generate (Auto)
                    </Button>
                  </Space>
                </Space>
              </div>
            )}
          </div>
        </Form.Item>

        <Tabs
          activeKey={activePlatformTab}
          onChange={setActivePlatformTab}
          items={platformTabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <Form.Item
                name={tab.key === 'main' ? 'content' : ['variants', tab.key]}
                label={tab.key === 'main' ? 'Main Content' : `${tab.label} Variant`}
              >
                <TextArea
                  rows={4}
                  placeholder={
                    tab.key === 'main'
                      ? 'Main content (used as default)'
                      : `Platform-specific content for ${tab.label}`
                  }
                  showCount
                  maxLength={2000}
                />
              </Form.Item>
            ),
          }))}
        />

        <Space orientation="horizontal" size="middle" style={{ width: '100%' }}>
          <Form.Item name="status" label="Status" style={{ flex: 1 }}>
            <Select placeholder="Select status">
              {statusOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="campaignId" label="Campaign" style={{ flex: 1 }}>
            <Select placeholder="Select campaign (optional)" allowClear>
              {campaigns.map((campaign) => (
                <Option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Space>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              {isEditMode && (
                <Button onClick={handleCancelEdit}>Cancel</Button>
              )}
              {!isEditMode && (
                <Button onClick={handleClose}>Cancel</Button>
              )}
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
      <ImageGenerationModal
        open={imageGenModalOpen}
        onCancel={() => setImageGenModalOpen(false)}
        onSuccess={handleImageGenSuccess}
      />
    </Modal>
  )
}

