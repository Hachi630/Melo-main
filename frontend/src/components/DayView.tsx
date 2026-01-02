import { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import styles from './DayView.module.css';
import { CalendarItem } from '../services/calendarService';
import PlatformIcon from './PlatformIcon';

interface DayViewProps {
  currentDate: Dayjs;
  items: CalendarItem[];
  onTimeSlotClick: (date: Dayjs, time: string) => void;
  onItemClick: (item: CalendarItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CELL_HEIGHT = 60; // 1 hour height in px

export default function DayView({ currentDate, items, onTimeSlotClick, onItemClick }: DayViewProps) {
  const [currentTime, setCurrentTime] = useState(dayjs());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 60000);

    // Scroll to current time on mount
    if (scrollRef.current) {
      const currentHour = dayjs().hour();
      scrollRef.current.scrollTop = (currentHour - 1) * CELL_HEIGHT;
    }

    return () => clearInterval(timer);
  }, []);

  // Calculate current time position
  const getCurrentTimePosition = () => {
    if (!currentDate.isSame(currentTime, 'day')) return -1000; // Hide if not today
    const minutes = currentTime.hour() * 60 + currentTime.minute();
    return (minutes / 60) * CELL_HEIGHT;
  };

  // Filter items for the current day
  const getItemsForDay = () => {
    const dateStr = currentDate.format('YYYY-MM-DD');
    return items.filter(item => item.date === dateStr);
  };

  const dayItems = getItemsForDay();
  const timedItems = dayItems.filter(i => i.time);

  // Calculate item position and height based on time
  const getItemStyle = (item: CalendarItem) => {
    if (!item.time) return {};

    const [hours, minutes] = item.time.split(':').map(Number);
    const top = (hours + minutes / 60) * CELL_HEIGHT;
    const height = 60; // Default 1 hour duration

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const isToday = currentDate.isSame(dayjs(), 'day');

  return (
    <div className={styles.dayViewContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.dateInfo}>
          <h1 className={styles.dateTitle}>{currentDate.format('MMMM D, YYYY')}</h1>
          <span className={styles.dayName}>{currentDate.format('dddd')}</span>
        </div>
      </div>

      {/* Scrollable Main Grid */}
      <div className={styles.scrollArea} ref={scrollRef}>
        {/* Time Axis */}
        <div className={styles.timeAxis}>
          {HOURS.map(hour => (
            <div key={hour} className={styles.timeSlot} style={{ height: CELL_HEIGHT }}>
              <span className={styles.timeLabel}>
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
            </div>
          ))}
        </div>

        {/* Main Day Column */}
        <div className={styles.dayColumn}>
          {/* Horizontal Grid Lines */}
          {HOURS.map(hour => (
            <div
              key={`line-${hour}`}
              className={styles.gridLine}
              style={{ top: hour * CELL_HEIGHT }}
            />
          ))}

          {/* Current Time Indicator */}
          {isToday && (
            <div
              className={styles.currentTimeIndicator}
              style={{ top: getCurrentTimePosition() }}
            >
              <div className={styles.currentTimeLabel}>
                {currentTime.format('H:mm')}
              </div>
              <div className={styles.currentTimeDot} />
            </div>
          )}

          {/* Events */}
          {timedItems.map(item => (
            <div
              key={item.id}
              className={`${styles.eventCard} ${styles[`event_${item.platform}`]}`}
              style={getItemStyle(item)}
              onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
            >
              <div className={styles.eventTitle}>
                <PlatformIcon platform={item.platform} style={{ marginRight: 4, fontSize: '12px', verticalAlign: 'text-top' }} />
                {item.title}
              </div>
              <div className={styles.eventTime}>{item.time}</div>
            </div>
          ))}

          {/* Add Slot Buttons (on hover) */}
          {HOURS.map(hour => (
            <div
              key={`add-${hour}`}
              className={styles.addSlotButton}
              style={{ top: hour * CELL_HEIGHT }}
              onClick={() => onTimeSlotClick(currentDate, `${hour.toString().padStart(2, '0')}:00`)}
            >
              <PlusOutlined className={styles.addIcon} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

