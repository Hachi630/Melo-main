import { Button, Tabs, Empty, Typography, Tooltip, Tag, Space } from 'antd';
import { 
  PlusOutlined, 
  CopyOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MoreOutlined,
  CalendarOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarItem } from '../services/calendarService';
import styles from '../pages/Calendar.module.css';
import { useEffect } from 'react';

const { Text, Title } = Typography;

interface CalendarDetailPanelProps {
  selectedDate: Dayjs;
  items: CalendarItem[];
  upcomingItems: CalendarItem[];
  onAddItem: () => void;
  onEditItem: (item: CalendarItem) => void;
  onDeleteItem: (id: string) => void;
}

export default function CalendarDetailPanel({
  selectedDate,
  items,
  upcomingItems,
  onAddItem,
  onEditItem,
  onDeleteItem
}: CalendarDetailPanelProps) {
  
  const platformIcons: Record<string, string> = {
    instagram: '🟣',
    instagram_post: '🟣',
    instagram_story: '📸',
    instagram_reels: '🎬',
    tiktok: '🎵',
    facebook: '📘',
    twitter: '🐦',
    linkedin: '💼'
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      instagram_post: 'Post',
      instagram_story: 'Story',
      instagram_reels: 'Reels',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      twitter: 'X',
      linkedin: 'LinkedIn'
    };
    return labels[platform] || platform;
  };

  const renderItemCard = (item: CalendarItem) => (
    <div key={item.id} className={styles.detailItemCard} onClick={() => onEditItem(item)}>
      <div className={styles.cardHeader}>
        <div className={styles.cardPlatform}>
          <span>{platformIcons[item.platform]}</span>
          <span>{getPlatformLabel(item.platform)}</span>
        </div>
        <span className={styles.cardStatus}>
          {dayjs(item.date).isBefore(dayjs(), 'day') ? 'Posted' : 'Scheduled'}
        </span>
      </div>
      <div className={styles.cardTitle}>{item.title}</div>
      <div className={styles.cardTime}>
        {item.time || 'All day'}
      </div>
      <div className={styles.cardActions}>
        <Tooltip title="Edit">
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />} 
            onClick={(e) => { e.stopPropagation(); onEditItem(item); }} 
          />
        </Tooltip>
        <Tooltip title="Delete">
          <Button 
            type="text" 
            size="small" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id || ''); }} 
          />
        </Tooltip>
      </div>
    </div>
  );

  const renderSelectedDayTab = () => (
    <div className={styles.panelContent}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {selectedDate.format('MMM D, dddd')}
          </Title>
          <Text type="secondary">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </div>
        <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={onAddItem} />
      </div>

      {items.length > 0 ? (
        <div className={styles.itemsList}>
          {items.map(renderItemCard)}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No posts scheduled" />
          <Button type="dashed" onClick={onAddItem}>Schedule Post</Button>
        </div>
      )}
    </div>
  );

  const renderUpcomingTab = () => {
    // Group upcoming items by date
    const groupedItems = upcomingItems.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, CalendarItem[]>);

    const sortedDates = Object.keys(groupedItems).sort();

    return (
      <div className={styles.panelContent}>
        {sortedDates.length > 0 ? (
          sortedDates.map(date => (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong>{dayjs(date).format('MMM D, ddd')}</Text>
                {dayjs(date).isSame(dayjs(), 'day') && <Tag color="blue">Today</Tag>}
              </div>
              <div>
                {groupedItems[date].map(renderItemCard)}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No upcoming posts" />
          </div>
        )}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'day',
      label: (
        <span>
          <CalendarOutlined /> Day
        </span>
      ),
      children: renderSelectedDayTab(),
    },
    {
      key: 'week',
      label: (
        <span>
          <MoreOutlined /> Week
        </span>
      ),
      children: renderUpcomingTab(),
    },
    {
      key: 'insights',
      label: (
        <span>
          <BarChartOutlined /> Insights
        </span>
      ),
      children: (
        <div className={styles.emptyState}>
          <Empty description="Insights coming soon" />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.detailPanelSection}>
      <Tabs 
        defaultActiveKey="day" 
        items={tabItems} 
        tabBarStyle={{ padding: '0 16px', margin: 0 }}
        style={{ height: '100%' }}
      />
    </div>
  );
}
