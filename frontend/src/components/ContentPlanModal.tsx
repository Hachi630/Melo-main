import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  message,
  List,
  Typography,
} from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import { Dayjs } from "dayjs";
import { useState } from "react";
import { PLATFORMS } from "./CalendarItemModal";

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ContentPlanModalProps {
  open: boolean;
  goal?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContentPlanModal({
  open,
  goal: initialGoal,
  onClose,
  onSuccess,
}: ContentPlanModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any[]>([]);
  const [planGenerated, setPlanGenerated] = useState(false);

  const platformOptions = [
    { value: PLATFORMS.INSTAGRAM_POST, label: "Instagram Post" },
    { value: PLATFORMS.INSTAGRAM_STORY, label: "Instagram Story" },
    { value: PLATFORMS.INSTAGRAM_REELS, label: "Instagram Reels" },
    { value: PLATFORMS.TIKTOK, label: "TikTok" },
    { value: PLATFORMS.FACEBOOK, label: "Facebook" },
    { value: PLATFORMS.TWITTER, label: "Twitter/X" },
    { value: PLATFORMS.LINKEDIN, label: "LinkedIn" },
  ];

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields([
        "goal",
        "dateRange",
        "platforms",
      ]);
      setLoading(true);

      const [startDate, endDate] = values.dateRange as [Dayjs, Dayjs];

      const response = await fetch("/api/chat/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          goal: values.goal,
          startDate: startDate.format("YYYY-MM-DD"),
          endDate: endDate.format("YYYY-MM-DD"),
          platforms: values.platforms,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate content plan");
      }

      setGeneratedPlan(data.plan || []);
      setPlanGenerated(true);
      message.success(`Generated ${data.plan?.length || 0} content items`);
    } catch (error: any) {
      console.error("Generate plan error:", error);
      message.error(error.message || "Failed to generate content plan");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToCalendar = async () => {
    if (generatedPlan.length === 0) {
      message.warning("Please generate a plan first");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/chat/send-to-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          items: generatedPlan,
          campaignId: form.getFieldValue("campaignId") || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send items to calendar");
      }

      message.success(
        `Successfully added ${data.count || 0} items to calendar`
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Send to calendar error:", error);
      message.error(error.message || "Failed to send items to calendar");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setGeneratedPlan([]);
    setPlanGenerated(false);
    onClose();
  };

  return (
    <Modal
      title="Generate Content Plan"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
    >
      <Form form={form} layout="vertical" initialValues={{ goal: initialGoal }}>
        <Form.Item
          name="goal"
          label="Marketing Goal"
          rules={[
            { required: true, message: "Please enter your marketing goal" },
          ]}
        >
          <TextArea
            rows={3}
            placeholder="e.g., Promote Lavender Candle sale, increase brand awareness..."
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Campaign Date Range"
          rules={[{ required: true, message: "Please select date range" }]}
        >
          <RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item
          name="platforms"
          label="Platforms"
          rules={[
            { required: true, message: "Please select at least one platform" },
          ]}
        >
          <Select mode="multiple" placeholder="Select platforms">
            {platformOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="campaignId" label="Campaign (Optional)">
          <Input placeholder="Campaign ID (optional)" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" onClick={handleGenerate} loading={loading}>
              Generate Plan
            </Button>
            {planGenerated && (
              <Button
                type="default"
                icon={<CalendarOutlined />}
                onClick={handleSendToCalendar}
                loading={loading}
              >
                Send to Calendar
              </Button>
            )}
            <Button onClick={handleClose}>Cancel</Button>
          </Space>
        </Form.Item>

        {planGenerated && generatedPlan.length > 0 && (
          <Form.Item label="Generated Plan Preview">
            <List
              size="small"
              bordered
              dataSource={generatedPlan}
              renderItem={(item: any) => (
                <List.Item>
                  <Space orientation="vertical" style={{ width: "100%" }}>
                    <div>
                      <Typography.Text strong>{item.date}</Typography.Text>
                      {" - "}
                      <Typography.Text type="secondary">
                        {item.platform}
                      </Typography.Text>
                    </div>
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Typography.Text type="secondary" ellipsis>
                      {item.content}
                    </Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
