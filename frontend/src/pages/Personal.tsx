import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Typography,
  Upload,
  Avatar,
  message,
  Modal,
} from 'antd'
import { useState, useEffect } from 'react'
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import styles from './Personal.module.css'
import { User, authService } from '../services/authService'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import dayjs from 'dayjs'

const { TextArea } = Input

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

interface PersonalProps {
  open?: boolean
  onClose?: () => void
  user?: User | null
  onLoginSuccess?: (user: User) => void
  isLoggedIn?: boolean
  onLogout?: () => void
}

export default function Personal({
  open = true,
  onClose = () => {},
  user: propUser,
  onLoginSuccess,
  isLoggedIn: _isLoggedIn,
  onLogout: _onLogout,
}: PersonalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(propUser || null)
  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    phone: '',
    birthday: '',
    email: '',
    gender: '',
    address: '',
    aboutMe: '',
    avatar: '',
  })
  const [originalData, setOriginalData] = useState(formData)
  const [avatarFile, setAvatarFile] = useState<UploadFile[]>([])
  const [avatarBase64, setAvatarBase64] = useState<string>('')
  
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Load user data when modal opens
  useEffect(() => {
    const loadUser = async () => {
      if (open) {
        const currentUser = propUser || await authService.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          setFormData({
            name: currentUser.name || '',
            brandName: currentUser.brandName || '',
            phone: currentUser.phone || '',
            birthday: currentUser.birthday || '',
            email: currentUser.email || '',
            gender: currentUser.gender || '',
            address: currentUser.address || '',
            aboutMe: currentUser.aboutMe || '',
            avatar: currentUser.avatar || '',
          })
          setOriginalData({
            name: currentUser.name || '',
            brandName: currentUser.brandName || '',
            phone: currentUser.phone || '',
            birthday: currentUser.birthday || '',
            email: currentUser.email || '',
            gender: currentUser.gender || '',
            address: currentUser.address || '',
            aboutMe: currentUser.aboutMe || '',
            avatar: currentUser.avatar || '',
          })
        }
      }
    }
    loadUser()
  }, [open, propUser])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData(originalData)
    setIsEditing(false)
    setAvatarFile([])
    setAvatarBase64('')
    // Clean up blob URLs
    if (formData.avatar && formData.avatar.startsWith('blob:')) {
      URL.revokeObjectURL(formData.avatar)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Use base64 avatar if available, otherwise use existing avatar URL
      const avatarToSave = avatarBase64 || formData.avatar
      
      const response = await authService.updateProfile({
        name: formData.name,
        brandName: formData.brandName,
        phone: formData.phone,
        birthday: formData.birthday,
        gender: formData.gender,
        address: formData.address,
        aboutMe: formData.aboutMe,
        avatar: avatarToSave,
      })

      if (response.success && response.user) {
        // Clean up blob URL if it was a temporary one
        if (formData.avatar && formData.avatar.startsWith('blob:')) {
          URL.revokeObjectURL(formData.avatar)
        }
        
        // Update formData with saved avatar (base64 or URL from server)
        const updatedFormData = {
          ...formData,
          avatar: response.user.avatar || avatarBase64 || formData.avatar,
        }
        
        setUser(response.user)
        setFormData(updatedFormData)
        setOriginalData(updatedFormData)
        setIsEditing(false)
        setAvatarBase64('')
        setAvatarFile([])
        onLoginSuccess?.(response.user)
        message.success('Profile updated successfully')
      } else {
        message.error(response.message || 'Failed to update profile')
      }
    } catch (error) {
      message.error('An error occurred while updating profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange: UploadProps['onChange'] = (info) => {
    // Get file from different possible locations
    const fileObj = 
      info.file.originFileObj || 
      (info.file as any).originFileObj || 
      (info.file as any)
    
    // Check if it's actually a File object
    if (fileObj && fileObj instanceof File) {
      // Validate file type
      const isJpgOrPng = fileObj.type === 'image/jpeg' || fileObj.type === 'image/png'
      if (!isJpgOrPng) {
        message.error('You can only upload JPG/PNG file!')
        return
      }
      // Validate file size
      const isLt2M = fileObj.size / 1024 / 1024 < 2
      if (!isLt2M) {
        message.error('Image must smaller than 2MB!')
        return
      }
      
      // Convert to base64 for saving and preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setAvatarBase64(base64String)
        // Use base64 for preview (works better than blob URL)
        setFormData({ ...formData, avatar: base64String })
      }
      reader.onerror = () => {
        message.error('Failed to read image file')
      }
      reader.readAsDataURL(fileObj)
      
      // Update file list for Upload component
      setAvatarFile([info.file])
    } else if (info.fileList && info.fileList.length > 0) {
      // Fallback: try to get file from fileList
      const fileFromList = info.fileList[0].originFileObj
      if (fileFromList && fileFromList instanceof File) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          setAvatarBase64(base64String)
          setFormData({ ...formData, avatar: base64String })
        }
        reader.readAsDataURL(fileFromList)
        setAvatarFile(info.fileList)
      }
    }
  }

  const beforeUpload = (_file: File) => {
    // Return false to prevent auto upload, we'll handle it manually in onChange
    return false
  }

  // Handle password change
  const handlePasswordChange = async () => {
    // Validate passwords
    if (!newPassword.trim()) {
      message.error('Please enter a new password')
      return
    }

    if (newPassword.length < 6) {
      message.error('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      message.error('Passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      const response = await authService.changePassword(newPassword)
      if (response.success) {
        message.success('Password changed successfully')
        setShowPasswordModal(false)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        message.error(response.message || 'Failed to change password')
      }
    } catch (error) {
      message.error('An error occurred while changing password')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Check if user is local auth user (can change password)
  const isLocalAuthUser = user?.authProvider === 'local' || !user?.authProvider

  const renderField = (
    _label: string,
    value: string,
    fieldName: keyof typeof formData,
    isTextArea = false
  ) => {
    if (isEditing) {
      if (fieldName === 'birthday') {
        return (
          <DatePicker
            size="large"
            style={{ width: '100%' }}
            value={formData.birthday ? dayjs(formData.birthday) : null}
            onChange={(date) =>
              setFormData({ ...formData, birthday: date ? date.format('YYYY-MM-DD') : '' })
            }
            format="YYYY-MM-DD"
          />
        )
      }
      if (fieldName === 'gender') {
        return (
          <Select
            size="large"
            style={{ width: '100%' }}
            value={formData.gender}
            onChange={(value) => setFormData({ ...formData, gender: value })}
            options={genderOptions}
          />
        )
      }
      if (isTextArea) {
        return (
          <TextArea
            size="large"
            rows={3}
            value={value}
            onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
          />
        )
      }
      return (
        <Input
          size="large"
          value={value}
          onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
        />
      )
    }
    return (
      <Typography.Text className={styles.fieldValue} type="secondary">
        {value || '—'}
      </Typography.Text>
    )
  }

  const handleModalClose = () => {
    // Reset editing state when closing
    if (isEditing) {
      handleCancel()
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleModalClose}
      title={
        <div className={styles.modalTitle}>
          <UserOutlined /> Personal Profile
        </div>
      }
      width={1000}
      className={styles.personalModal}
      footer={null}
      centered
    >
      <div className={styles.modalContent}>
        <div className={styles.headerSection}>
          <div className={styles.userInfo}>
            <div className={styles.avatarSection}>
              {isEditing ? (
                <Upload
                  name="avatar"
                  listType="picture-circle"
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/png"
                  maxCount={1}
                  fileList={avatarFile}
                >
                  {formData.avatar && !formData.avatar.startsWith('data:') ? (
                    <img src={formData.avatar} alt="avatar" className={styles.avatarImage} />
                  ) : formData.avatar && formData.avatar.startsWith('data:') ? (
                    <img src={formData.avatar} alt="avatar" className={styles.avatarImage} />
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className={styles.avatarImage} />
                  ) : (
                    <div>
                      <UserOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  )}
                </Upload>
              ) : (
                <Avatar
                  size={106}
                  src={user?.avatar || formData.avatar}
                  className={styles.avatar}
                >
                  {user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
                </Avatar>
              )}
            </div>
            <div className={styles.nameSection}>
              <Typography.Title level={1} className={styles.userName}>
                {isEditing ? (
                  <Input
                    size="large"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Name"
                    className={styles.nameInput}
                  />
                ) : (
                  user?.name || formData.name || 'User'
                )}
              </Typography.Title>
              <Typography.Text className={styles.brandName}>
                {isEditing ? (
                  <Input
                    size="large"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="Brand name"
                    className={styles.brandInput}
                  />
                ) : (
                  user?.brandName || formData.brandName || 'Brand name'
                )}
              </Typography.Text>
            </div>
          </div>
          <div className={styles.editButtonSection}>
            {isEditing ? (
              <Space>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={loading}
                >
                  Save
                </Button>
              </Space>
            ) : (
              <Space direction="vertical" size="middle">
                <Button icon={<EditOutlined />} onClick={handleEdit}>
                  Edit
                </Button>
                {isLocalAuthUser && (
                  <Button 
                    icon={<LockOutlined />} 
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change Password
                  </Button>
                )}
              </Space>
            )}
          </div>
        </div>

        <Row gutter={[24, 24]} className={styles.cardRow}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className={styles.infoCard}>
              <Typography.Title level={5} className={styles.cardTitle}>
                Phone number
              </Typography.Title>
              {renderField('Phone number', formData.phone, 'phone')}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className={styles.infoCard}>
              <Typography.Title level={5} className={styles.cardTitle}>
                Birthday
              </Typography.Title>
              {renderField('Birthday', formData.birthday, 'birthday')}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className={styles.infoCard}>
              <Typography.Title level={5} className={styles.cardTitle}>
                E-mail
              </Typography.Title>
              <Typography.Text className={styles.fieldValue} type="secondary">
                {user?.email || formData.email || '—'}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className={styles.infoCard}>
              <Typography.Title level={5} className={styles.cardTitle}>
                Gender
              </Typography.Title>
              {renderField('Gender', formData.gender, 'gender')}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Card className={styles.infoCard}>
              <Typography.Title level={5} className={styles.cardTitle}>
                Address
              </Typography.Title>
              {renderField('Address', formData.address, 'address')}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12}>
            <Card className={styles.infoCard}>
              <Typography.Title level={5} className={styles.cardTitle}>
                About me
              </Typography.Title>
              {renderField('About me', formData.aboutMe, 'aboutMe', true)}
            </Card>
          </Col>
        </Row>

        {/* Change Password Modal */}
        <Modal
          title="Change Password"
          open={showPasswordModal}
          onOk={handlePasswordChange}
          onCancel={() => {
            setShowPasswordModal(false)
            setNewPassword('')
            setConfirmPassword('')
          }}
          confirmLoading={passwordLoading}
          okText="Change Password"
          cancelText="Cancel"
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Text strong>New Password</Typography.Text>
              <Input.Password
                size="large"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                style={{ marginTop: 8 }}
              />
              <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                Password must be at least 6 characters long
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>Confirm Password</Typography.Text>
              <Input.Password
                size="large"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                style={{ marginTop: 8 }}
                onPressEnter={handlePasswordChange}
              />
            </div>
          </Space>
        </Modal>
      </div>
    </Modal>
  )
}

