import { useState, useEffect, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import styles from './WeekView.module.css';
import { CalendarItem } from '../services/calendarService';
import PlatformIcon from './PlatformIcon';

interface WeekViewProps {
  currentDate: Dayjs;
  items: CalendarItem[];
  onTimeSlotClick: (date: Dayjs, time: string) => void;
  onItemClick: (item: CalendarItem) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CELL_HEIGHT = 60; // 1 hour height in px

export default function WeekView({ currentDate, items, onTimeSlotClick, onItemClick }: WeekViewProps) {
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

  // Get start of the week (Sunday)
  const startOfWeek = currentDate.startOf('week');
  const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));

  // Calculate current time position
  const getCurrentTimePosition = () => {
    const minutes = currentTime.hour() * 60 + currentTime.minute();
    return (minutes / 60) * CELL_HEIGHT;
  };

  // Filter items for a specific day
  const getItemsForDay = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return items.filter(item => item.date === dateStr);
  };

  // Calculate item position and height based on time
  const getItemStyle = (item: CalendarItem) => {
    if (!item.time) return {}; // Skip if no time (handled in all-day)

    const [hours, minutes] = item.time.split(':').map(Number);
    const top = (hours + minutes / 60) * CELL_HEIGHT;
    const height = 60; // Default 1 hour duration

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  return (
    <div className={styles.weekViewContainer}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.timeAxis} style={{ border: 'none' }} /> {/* Spacer */}
        {weekDays.map((day) => {
          const isToday = day.isSame(currentTime, 'day');
          return (
            <div key={day.toString()} className={`${styles.dayColumnHeader} ${isToday ? styles.todayColumn : ''}`}>
              <span className={styles.dayName}>{day.format('ddd')}</span>
              <div className={styles.dayNumber}>{day.format('D')}</div>
            </div>
          );
        })}
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

        {/* Grid Container */}
        <div className={styles.gridContainer}>
          {/* Horizontal Grid Lines */}
          {HOURS.map(hour => (
            <div
              key={`line-${hour}`}
              className={styles.gridLine}
              style={{ top: hour * CELL_HEIGHT }}
            />
          ))}

          {/* Current Time Indicator */}
          {weekDays.some(d => d.isSame(currentTime, 'day')) && (
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

          {/* Day Columns */}
          {weekDays.map((day) => (
            <div key={day.toString()} className={styles.gridColumn}>
              {/* Events */}
              {getItemsForDay(day).filter(i => i.time).map(item => (
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
                  onClick={() => onTimeSlotClick(day, `${hour.toString().padStart(2, '0')}:00`)}
                >
                  <PlusOutlined className={styles.addIcon} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

