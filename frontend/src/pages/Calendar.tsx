import { Calendar, Layout, Button, message, Grid, Segmented, Select, Input } from 'antd';
import {
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import Header from '../components/Header';
import { MELO_LOGO } from '../constants/assets';
import styles from './Calendar.module.css';
import { User } from '../services/authService';
import { CalendarItem, calendarService } from '../services/calendarService';
import CalendarItemModal, { PLATFORMS } from '../components/CalendarItemModal';
import CalendarDetailPanel from '../components/CalendarDetailPanel';
import WeekView from '../components/WeekView';
import DayView from '../components/DayView';
import YearView from '../components/YearView';
import PlatformIcon, { PLATFORM_COLORS } from '../components/PlatformIcon';

const { useBreakpoint } = Grid;
const { Option } = Select;

interface CalendarProps {
  isLoggedIn: boolean;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  user?: User | null;
}

// Draggable Item Component
function DraggableCalendarItem({ item, onClick, isMonthView = false }: { item: CalendarItem, onClick: (e: React.MouseEvent) => void, isMonthView?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id || '',
    data: item,
  });

  const color = PLATFORM_COLORS[item.platform] || '#0071e3';
  const style = isDragging ? { opacity: 0.5 } : undefined;

  if (isMonthView) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={styles.monthEventLabel}
        onClick={onClick}
        style={{ ...style, borderLeftColor: color }}
      >
        <PlatformIcon platform={item.platform} style={{ marginRight: 4, fontSize: '12px' }} />
        <span className={styles.eventLabelText}>{item.title}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={styles.itemChip}
      onClick={onClick}
      style={style}
    >
      <PlatformIcon platform={item.platform} style={{ marginRight: 6, fontSize: '14px' }} />
      <span className={styles.itemTitle}>{item.title}</span>
    </div>
  );
}

// Droppable Date Cell Component
function DroppableDateCell({ date, children, onDateClick }: { date: Dayjs, children: React.ReactNode, onDateClick: (date: Dayjs) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: date.format('YYYY-MM-DD'),
    data: { date },
  });

  const style = isOver ? { backgroundColor: '#f0f7ff' } : undefined;

  return (
    <div
      ref={setNodeRef}
      className={styles.dateCellContent}
      style={style}
      onClick={() => onDateClick(date)}
    >
      {children}
      <div className={styles.addBtnOverlay}>
        <Button
          type="primary"
          size="small"
          shape="circle"
          icon={<PlusOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onDateClick(date);
          }}
        />
      </div>
    </div>
  );
}

export default function CalendarPage({
  isLoggedIn,
  onLoginSuccess,
  onLogout,
  user,
}: CalendarProps) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [value, setValue] = useState(dayjs());
  const [selectedValue, setSelectedValue] = useState<Dayjs>(dayjs());
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  // const [loading, setLoading] = useState(false); // Unused
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [activeDragItem, setActiveDragItem] = useState<CalendarItem | null>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Week');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [brands, setBrands] = useState<Array<{ id: string; name: string; brandName: string }>>([]);

  // Load calendar items
  const loadCalendarItems = useCallback(async () => {
    if (!isLoggedIn) return;

    // setLoading(true);
    try {
      // Determine date range based on view mode
      let start: Dayjs, end: Dayjs;
      if (viewMode === 'Week') {
        start = value.startOf('week');
        end = value.endOf('week');
      } else if (viewMode === 'Day') {
        start = value.startOf('day');
        end = value.endOf('day');
      } else {
        start = value.startOf('month').subtract(7, 'day');
        end = value.endOf('month').add(7, 'day');
      }

      const response = await calendarService.getCalendarItems(
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD')
      );

      if (response.success && response.items) {
        setCalendarItems(response.items);
      } else {
        message.error(response.message || 'Failed to load calendar items');
      }
    } catch (error) {
      console.error('Load calendar items error:', error);
      message.error('Failed to load calendar items');
    } finally {
      // setLoading(false);
    }
  }, [value, isLoggedIn, viewMode]);

  useEffect(() => {
    loadCalendarItems();
  }, [loadCalendarItems]);

  // Load brands from localStorage
  useEffect(() => {
    try {
      const savedCompanies = localStorage.getItem("melo_companies");
      if (savedCompanies) {
        const companies = JSON.parse(savedCompanies);
        const brandList = companies.map((c: any) => ({
          id: c.id,
          name: c.name,
          brandName: c.brandName || c.name
        }));
        setBrands(brandList);
        console.log("Loaded brands:", brandList);
      }
    } catch (error) {
      console.error("Error loading brands:", error);
    }
  }, []);

  // Auto-update items without companyId when a brand is selected
  useEffect(() => {
    if (selectedBrandId && selectedBrandId !== 'all' && calendarItems.length > 0) {
      const itemsWithoutCompanyId = calendarItems.filter(item => !item.companyId || item.companyId === null);
      if (itemsWithoutCompanyId.length > 0) {
        console.log(`Found ${itemsWithoutCompanyId.length} items without companyId. Auto-updating them to selected brand: ${selectedBrandId}`);
        
        // Update items in batch
        const updatePromises = itemsWithoutCompanyId.map(item =>
          calendarService.updateCalendarItem(item.id, { companyId: selectedBrandId })
        );
        
        Promise.all(updatePromises)
          .then(() => {
            console.log("Successfully updated items with companyId");
            loadCalendarItems(); // Reload to get updated items
          })
          .catch(error => {
            console.error("Error updating items with companyId:", error);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId]); // Only run when brand selection changes

  // Helpers
  const getFilteredItems = (items: CalendarItem[]) => {
    let filtered = items;
    
    // Filter by brand
    if (selectedBrandId && selectedBrandId !== 'all') {
      console.log("Filtering by brand:", selectedBrandId);
      console.log("Available brands:", brands.map(b => ({ id: b.id, name: b.brandName })));
      console.log("Calendar items before filter:", items.map(i => ({ id: i.id, title: i.title, companyId: i.companyId })));
      
      filtered = filtered.filter(item => {
        // Strict match: companyId must exactly match selectedBrandId
        const matches = item.companyId === selectedBrandId;
        if (!matches) {
          console.log(`Item ${item.id} (${item.title}) - companyId: "${item.companyId}" (type: ${typeof item.companyId}), expected: "${selectedBrandId}" (type: ${typeof selectedBrandId})`);
        }
        return matches;
      });
      
      console.log("Calendar items after filter:", filtered.length);
      if (filtered.length === 0 && items.length > 0) {
        console.warn("No items matched the selected brand. This might mean existing items don't have companyId set.");
        console.log("Items without companyId:", items.filter(i => !i.companyId || i.companyId === null).length);
      }
    }
    
    // Filter by platform
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter(item => selectedPlatforms.includes(item.platform));
    }
    
    return filtered;
  };

  const getItemsForDate = (date: Dayjs): CalendarItem[] => {
    const dateStr = date.format('YYYY-MM-DD');
    const items = calendarItems.filter((item) => item.date === dateStr);
    return getFilteredItems(items);
  };

  const getUpcomingWeekItems = (): CalendarItem[] => {
    const today = dayjs().startOf('day');
    const nextWeek = today.add(7, 'day');
    const items = calendarItems.filter((item) => {
      const itemDate = dayjs(item.date).startOf('day');
      return (itemDate.isSame(today) || itemDate.isAfter(today)) && itemDate.isBefore(nextWeek);
    });
    return getFilteredItems(items).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Event Handlers
  const onSelect = (newValue: Dayjs) => {
    setValue(newValue);
    setSelectedValue(newValue);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = calendarItems.find(i => i.id === active.id);
    if (item) setActiveDragItem(item);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const itemId = active.id as string;
    const newDateStr = over.id as string;
    const item = calendarItems.find(i => i.id === itemId);

    if (item && item.date !== newDateStr) {
      // Optimistic update
      const updatedItems = calendarItems.map(i =>
        i.id === itemId ? { ...i, date: newDateStr } : i
      );
      setCalendarItems(updatedItems);

      try {
        await calendarService.updateCalendarItem(itemId, { date: newDateStr });
        message.success('Moved to ' + newDateStr);
      } catch (error) {
        message.error('Failed to move item');
        loadCalendarItems(); // Revert on error
      }
    }
  };

  const handleNewItem = (platform?: string) => {
    setSelectedItem(platform ? { platform } as CalendarItem : null);
    setSelectedDate(selectedValue);
    setSelectedTime(undefined); // Reset time
    setModalOpen(true);
  };

  // Handler specifically for WeekView time slot clicks
  const handleTimeSlotClick = (date: Dayjs, time: string) => {
    setSelectedItem(null);
    setSelectedDate(date);
    setSelectedTime(time); // Set specific time
    setModalOpen(true);
  };

  const dateCellRender = (date: Dayjs) => {
    const items = getItemsForDate(date);
    const isToday = date.isSame(dayjs(), 'day');
    const maxDisplay = 3;
    const displayItems = items.slice(0, maxDisplay);
    const remainingCount = items.length - maxDisplay;

    return (
      <DroppableDateCell date={date} isToday={isToday} onDateClick={() => setSelectedValue(date)}>
        <div className={styles.monthDateCell}>
          <div className={styles.monthDateNumber}>
            {isToday ? (
              <span className={styles.monthTodayCircle}>{date.date()}</span>
            ) : (
              <span className={styles.monthDateText}>{date.date()}</span>
            )}
          </div>
          <div className={styles.monthEventsList}>
            {displayItems.map(item => (
              <DraggableCalendarItem
                key={item.id}
                item={item}
                isMonthView={true}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                  setModalOpen(true);
                }}
              />
            ))}
            {remainingCount > 0 && (
              <div className={styles.monthMoreIndicator}>
                {remainingCount} →
              </div>
            )}
          </div>
        </div>
      </DroppableDateCell>
    );
  };

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
      {/* Sticky Header */}
      <div className={styles.headerBar}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft} />

          <div className={styles.headerCenter}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => {
                const mode = viewMode === 'Week' ? 'week' : viewMode === 'Day' ? 'day' : 'month';
                const newValue = value.subtract(1, mode);
                setValue(newValue);
              }}
            />
            <div className={styles.currentDate}>
              {viewMode === 'Year' ? value.format('YYYY') : value.format('MMMM YYYY')}
            </div>
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={() => {
                const mode = viewMode === 'Week' ? 'week' : viewMode === 'Day' ? 'day' : 'month';
                const newValue = value.add(1, mode);
                setValue(newValue);
              }}
            />
            <Button
              size="small"
              onClick={() => {
                const today = dayjs();
                setValue(today);
                setSelectedValue(today);
                setViewMode('Day');
              }}
            >
              Today
            </Button>
            <Segmented
              options={['Day', 'Week', 'Month', 'Year']}
              value={viewMode}
              onChange={(v) => setViewMode(v as any)}
              style={{ marginLeft: 8 }}
            />
          </div>

          <div className={styles.headerRight}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              className={styles.addPostBtn}
              onClick={() => handleNewItem()}
            >
              Add Post
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <Select 
          value={selectedBrandId} 
          onChange={setSelectedBrandId}
          style={{ width: 150 }} 
          bordered={false}
        >
          <Option value="all">All Brands</Option>
          {brands.map(brand => (
            <Option key={brand.id} value={brand.id}>
              {brand.brandName || brand.name}
            </Option>
          ))}
        </Select>
        <Select
          mode="multiple"
          placeholder="Filter by platform"
          allowClear
          style={{ minWidth: 200 }}
          value={selectedPlatforms}
          onChange={setSelectedPlatforms}
          suffixIcon={<FilterOutlined />}
          maxTagCount="responsive"
          bordered={false}
        >
          <Option value={PLATFORMS.INSTAGRAM_POST}>Instagram Post</Option>
          <Option value={PLATFORMS.INSTAGRAM_STORY}>Instagram Story</Option>
          <Option value={PLATFORMS.INSTAGRAM_REELS}>Instagram Reels</Option>
          <Option value={PLATFORMS.TIKTOK}>TikTok</Option>
          <Option value={PLATFORMS.FACEBOOK}>Facebook</Option>
          <Option value={PLATFORMS.TWITTER}>Twitter/X</Option>
          <Option value={PLATFORMS.LINKEDIN}>LinkedIn</Option>
        </Select>
        <Select defaultValue="all" style={{ width: 100 }} bordered={false}>
          <Option value="all">All Status</Option>
          <Option value="scheduled">Scheduled</Option>
          <Option value="draft">Draft</Option>
        </Select>
        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="Search..."
          bordered={false}
          style={{ width: 200, background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}
        />
      </div>

      <div className={styles.mainContent}>
        {viewMode === 'Day' ? (
          <div className={styles.calendarSection}>
            <DayView
              currentDate={value}
              items={getFilteredItems(calendarItems)}
              onTimeSlotClick={handleTimeSlotClick}
              onItemClick={(item) => { setSelectedItem(item); setModalOpen(true); }}
            />
          </div>
        ) : viewMode === 'Week' ? (
          <div className={styles.calendarSection}>
            <WeekView
              currentDate={value}
              items={getFilteredItems(calendarItems)}
              onTimeSlotClick={handleTimeSlotClick}
              onItemClick={(item) => { setSelectedItem(item); setModalOpen(true); }}
            />
          </div>
        ) : viewMode === 'Year' ? (
          <div className={`${styles.calendarSection} ${styles.yearViewSection} `}>
            <YearView
              currentDate={value}
              items={getFilteredItems(calendarItems)}
              onMonthClick={(date) => {
                setValue(date);
                setViewMode('Month');
              }}
              onItemClick={(item) => { setSelectedItem(item); setModalOpen(true); }}
            />
          </div>
        ) : (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={styles.calendarSection}>
              <div className={styles.calendarContainer}>
                <div className={styles.monthHeader}>
                  <h2 className={styles.monthTitle}>{value.format('MMMM YYYY')}</h2>
                </div>
                <Calendar
                  fullscreen={!isMobile}
                  headerRender={() => null} // Custom header used above
                  value={value}
                  onSelect={onSelect}
                  dateCellRender={dateCellRender}
                  monthCellRender={() => null} // Disable default month cell
                />
              </div>
            </div>
            <DragOverlay>
              {activeDragItem ? (
                <div className={styles.monthEventLabel} style={{ transform: 'scale(1.05)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                  <span className={styles.eventDot} />
                  <span className={styles.eventLabelText}>{activeDragItem.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {viewMode !== 'Year' && (
          <CalendarDetailPanel
            selectedDate={selectedValue}
            items={getItemsForDate(selectedValue)}
            upcomingItems={getUpcomingWeekItems()}
            onAddItem={() => handleNewItem()}
            onEditItem={(item) => { setSelectedItem(item); setModalOpen(true); }}
            onDeleteItem={async (id) => {
              await calendarService.deleteCalendarItem(id);
              loadCalendarItems();
            }}
          />
        )}
      </div>

      {/* Modals */}
      {isLoggedIn && (
        <CalendarItemModal
          open={modalOpen}
          item={selectedItem}
          defaultDate={selectedDate || undefined}
          defaultTime={selectedTime} // Pass specific time
          onClose={() => {
            setModalOpen(false);
            setSelectedItem(null);
            setSelectedDate(null);
            setSelectedTime(undefined);
          }}
          onSave={() => {
            loadCalendarItems();
            setModalOpen(false);
          }}
        />
      )}
    </Layout>
  );
}
