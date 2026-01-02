import { Card, Calendar, Layout, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useState } from 'react'
import Header from '../components/Header'
import { MELO_LOGO } from '../constants/assets'
import styles from './CalendarPlaceholder.module.css'
import { User } from '../services/authService'

const { Content } = Layout

interface CalendarPlaceholderProps {
  isLoggedIn: boolean
  onLoginSuccess: (user: User) => void
  onLogout: () => void
  user?: User | null
}

export default function CalendarPlaceholder({
  isLoggedIn,
  onLoginSuccess,
  onLogout,
  user,
}: CalendarPlaceholderProps) {
  const [value, setValue] = useState(dayjs())
  const [selectedValue, setSelectedValue] = useState<Dayjs>(dayjs())

  const onSelect = (newValue: Dayjs) => {
    setValue(newValue)
    setSelectedValue(newValue)
  }

  const onPanelChange = (newValue: Dayjs) => {
    setValue(newValue)
  }

  return (
    <Layout className={styles.layout}>
      <Header
        isLoggedIn={isLoggedIn}
        showBrandName={false}
        logoSrc={MELO_LOGO}
        onLoginSuccess={onLoginSuccess}
        onLogout={onLogout}
        user={user}
      />
      <Content className={styles.content}>
        <Space orientation="vertical" size="large" className={styles.container}>
          <Typography.Title level={2} className={styles.title}>
            Smart Calendar
          </Typography.Title>
          <Card className={styles.card}>
            <Calendar
              fullscreen
              validRange={[dayjs().subtract(1, 'year'), dayjs().add(2, 'year')]}
              value={value}
              onSelect={onSelect}
              onPanelChange={onPanelChange}
            />
          </Card>
          <Card className={styles.card}>
            <Typography.Text strong>
              Selected date: {selectedValue.format('YYYY-MM-DD')}
            </Typography.Text>
          </Card>
        </Space>
      </Content>
    </Layout>
  )
}
