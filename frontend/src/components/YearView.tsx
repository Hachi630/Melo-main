import dayjs, { Dayjs } from 'dayjs';
import { CalendarItem } from '../services/calendarService';
import styles from './YearView.module.css';

interface YearViewProps {
  currentDate: Dayjs;
  items: CalendarItem[];
  onMonthClick: (date: Dayjs) => void;
  onItemClick: (item: CalendarItem) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function YearView({ currentDate, items, onMonthClick, onItemClick }: YearViewProps) {
  const year = currentDate.year();
  const today = dayjs();

  // Get items for a specific date
  const getItemsForDate = (date: Dayjs): CalendarItem[] => {
    const dateStr = date.format('YYYY-MM-DD');
    return items.filter(item => item.date === dateStr);
  };

  // Render a single month
  const renderMonth = (monthIndex: number) => {
    const monthStart = dayjs().year(year).month(monthIndex).startOf('month');
    const monthEnd = monthStart.endOf('month');
    const startDate = monthStart.startOf('week'); // Start from Sunday
    const endDate = monthEnd.endOf('week'); // End on Saturday
    
    const days: (Dayjs | null)[] = [];
    let current = startDate;
    
    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      if (current.isBefore(monthStart) || current.isAfter(monthEnd)) {
        days.push(null); // Day from previous/next month
      } else {
        days.push(current);
      }
      current = current.add(1, 'day');
    }

    const monthName = MONTHS[monthIndex];
    const isCurrentMonth = today.year() === year && today.month() === monthIndex;

    return (
      <div 
        key={monthIndex} 
        className={styles.monthCell}
        onClick={() => onMonthClick(monthStart)}
      >
        <div className={styles.monthHeader}>
          <span className={styles.monthName}>{monthName}</span>
        </div>
        
        <div className={styles.weekdayHeaders}>
          {WEEKDAYS.map((day, idx) => (
            <div key={idx} className={styles.weekdayHeader}>{day}</div>
          ))}
        </div>
        
        <div className={styles.dateGrid}>
          {days.map((date, idx) => {
            if (!date) {
              return <div key={idx} className={styles.dateCell} />;
            }
            
            const isToday = date.isSame(today, 'day');
            const isCurrentMonthDate = date.month() === monthIndex;
            const dateItems = getItemsForDate(date);
            const hasItems = dateItems.length > 0;

            return (
              <div
                key={idx}
                className={`${styles.dateCell} ${!isCurrentMonthDate ? styles.otherMonth : ''} ${isToday ? styles.today : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dateItems.length > 0) {
                    onItemClick(dateItems[0]);
                  }
                }}
              >
                <span className={styles.dateNumber}>{date.date()}</span>
                {hasItems && (
                  <div className={styles.eventIndicator}>
                    {dateItems.slice(0, 3).map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className={`${styles.eventDot} ${styles[`event_${item.platform}`]}`}
                        title={item.title}
                      />
                    ))}
                    {dateItems.length > 3 && (
                      <span className={styles.moreEvents}>+{dateItems.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.yearViewContainer}>
      <div className={styles.yearHeader}>
        <h1 className={styles.yearTitle}>{year}</h1>
      </div>
      <div className={styles.monthsGrid}>
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </div>
    </div>
  );
}

