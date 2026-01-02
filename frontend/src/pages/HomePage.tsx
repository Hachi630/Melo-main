import { Button, Card, Col, Layout, Row, Space, Typography } from "antd";
import {
  MessageOutlined,
  ShopOutlined,
  CalendarOutlined,
  PictureOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  BulbOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import styles from "./HomePage.module.css";
import { User } from "../services/authService";
import lulinYangImg from "../img/Lulin Yang.png";
import kikiXingImg from "../img/Kiki Xing.png";
import tazwarHabibImg from "../img/Tazwar Habib.png";
import weijingZhangImg from "../img/Weijing Zhang.png";
import xingyuanZhouImg from "../img/Xingyuan Zhou.png";
import meloLogo from "../img/melo-logo.jpg";

const { Footer } = Layout;
const { Title, Paragraph } = Typography;

interface HomePageProps {
  isLoggedIn?: boolean;
  onLoginSuccess?: (user: User) => void;
  onLogout?: () => void;
  user?: User | null;
}

export default function HomePage({
  isLoggedIn = false,
  onLoginSuccess,
}: HomePageProps) {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleLoginSuccess = (user: User) => {
    onLoginSuccess?.(user);
    setIsAuthModalOpen(false);
    navigate("/dashboard");
  };

  const products = [
    {
      icon: <MessageOutlined className={styles.productIcon} />,
      title: "AI Chat Interface",
      description:
        "Intelligent conversation assistant powered by advanced AI to help you create compelling marketing content and strategies.",
    },
    {
      icon: <ShopOutlined className={styles.productIcon} />,
      title: "Brand Profile",
      description:
        "Configure your brand voice, target audience, and knowledge base to ensure consistent messaging across all channels.",
    },
    {
      icon: <CalendarOutlined className={styles.productIcon} />,
      title: "Smart Calendar",
      description:
        "Schedule and manage your marketing campaigns with an intuitive calendar interface that keeps you organized.",
    },
    {
      icon: <PictureOutlined className={styles.productIcon} />,
      title: "Image Generation",
      description:
        "Generate stunning visuals for your marketing campaigns using AI-powered image generation technology.",
    },
  ];

  const advantages = [
    {
      icon: <ShopOutlined className={styles.advantageIcon} />,
      title: "Remembers Your Brand",
      description:
        "Melo keeps a persistent Brand DNA profile instead of starting from a blank chat every time.",
    },
    {
      icon: <CalendarOutlined className={styles.advantageIcon} />,
      title: "Campaign-level Planning",
      description:
        "You describe your goals, Melo builds multi-day, multi-channel campaign structures for you.",
    },
    {
      icon: <ThunderboltOutlined className={styles.advantageIcon} />,
      title: "One Workflow Instead of Many Tools",
      description:
        "Ideas, copy, scheduling and performance live in one place – no more switching between five tabs.",
    },
    {
      icon: <LineChartOutlined className={styles.advantageIcon} />,
      title: "Learns From Your Performance",
      description:
        "Melo uses post performance to improve future suggestions for your specific audience.",
    },
  ];

  const outcomes = [
    {
      icon: <LineChartOutlined className={styles.outcomeIcon} />,
      title: "Increased Efficiency",
      description:
        "Reduce manual copy-pasting between tools and manage your campaigns from one place.",
    },
    {
      icon: <SafetyOutlined className={styles.outcomeIcon} />,
      title: "Brand Consistency",
      description:
        "Keep a unified brand voice and style across every post and channel with Brand DNA profiles.",
    },
    {
      icon: <ClockCircleOutlined className={styles.outcomeIcon} />,
      title: "Faster Content Creation",
      description:
        "Turn business goals into ready-to-edit content ideas and drafts in minutes.",
    },
    {
      icon: <LineChartOutlined className={styles.outcomeIcon} />,
      title: "Better Engagement",
      description:
        "Create content that truly resonates with your audience by understanding their needs and preferences.",
    },
  ];

  const targetAudiences = [
    {
      icon: <UserOutlined className={styles.audienceIcon} />,
      title: "Independent Brand Owners",
      description:
        "Owners who run their brand and marketing themselves and need simple, on-brand workflows.",
    },
    {
      icon: <TeamOutlined className={styles.audienceIcon} />,
      title: "Solo & Small Marketing Teams",
      description:
        "Marketers handling social, email and campaigns with very limited time and tools.",
    },
    {
      icon: <FileTextOutlined className={styles.audienceIcon} />,
      title: "Freelance Social Media Managers",
      description:
        "Freelancers managing multiple client accounts who must keep each brand distinct and consistent.",
    },
    {
      icon: <BulbOutlined className={styles.audienceIcon} />,
      title: "Content-first Founders",
      description:
        "Founders who know content matters but can't plan every post from scratch.",
    },
  ];

  return (
    <Layout className={styles.layout}>
      {/* Header Bar */}
      <header className={styles.headerBar}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <img src={meloLogo} alt="Melo" className={styles.headerLogo} />
          </div>
          <div className={styles.headerTagline}>
            AI Social Media & Marketing Manager For Your Business
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContentWrapper}>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12} className={styles.heroLeft}>
              <div className={styles.heroContent}>
                <Title level={1} className={styles.heroTitle}>
                  <span className={styles.gradientText1}>Start</span> growing
                  your small brand with{" "}
                  <span className={styles.gradientText2}>AI-powered</span>{" "}
                  marketing
                </Title>
                <Paragraph className={styles.heroSubtitle}>
                  Melo helps small brands and lean marketing teams plan
                  campaigns, create on-brand content, and manage social media in
                  one place – without needing a full-time marketing department.
                </Paragraph>
                <Space size="large" className={styles.heroButtons}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleGetStarted}
                    className={styles.heroButtonPrimary}
                  >
                    Get Started
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate("/dashboard")}
                    className={styles.heroButtonSecondary}
                  >
                    Explore Melo
                  </Button>
                </Space>
                <div className={styles.scrollHint}>
                  <DownOutlined className={styles.scrollIcon} />
                  <span>Scroll to learn more</span>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={12} className={styles.heroRight}>
              <div className={styles.heroVisuals}>
                <div className={styles.abstractBackground}></div>
                <div className={styles.productCardsContainer}>
                  {products.slice(0, 3).map((product, index) => (
                    <Card
                      key={index}
                      className={styles.heroProductCard}
                      style={{
                        transform: `rotate(${index === 0 ? -5 : index === 1 ? 5 : -3}deg)`,
                      }}
                    >
                      <div className={styles.heroProductIconWrapper}>
                        {product.icon}
                      </div>
                      <Title level={4} className={styles.heroProductTitle}>
                        {product.title}
                      </Title>
                      <Paragraph className={styles.heroProductDescription}>
                        {product.description}
                      </Paragraph>
                      <div className={styles.heroProductBadge}>
                        <span>Featured</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Products Section */}
      <section className={styles.section}>
        <div className={styles.sectionContentWrapper}>
          <Title level={2} className={styles.sectionTitle}>
            Our <span className={styles.gradientText1}>Products</span>
          </Title>
          <Paragraph className={styles.sectionDescription}>
            Comprehensive tools to power your marketing success
          </Paragraph>
          <Row gutter={[24, 24]} className={styles.productsRow}>
            {products.map((product, index) => (
              <Col xs={24} sm={12} md={12} lg={6} xl={6} key={index}>
                <Card className={styles.productCard} hoverable>
                  <div className={styles.productIconWrapper}>
                    {product.icon}
                  </div>
                  <Title level={4} className={styles.productTitle}>
                    {product.title}
                  </Title>
                  <Paragraph className={styles.productDescription}>
                    {product.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Advantages Section */}
      <section className={styles.section}>
        <div className={styles.sectionContentWrapper}>
          <Title level={2} className={styles.sectionTitle}>
            Why Choose <span className={styles.gradientText2}>Melo</span>
          </Title>
          <Paragraph className={styles.sectionDescription}>
            Discover what makes our platform the best choice for your marketing
            needs
          </Paragraph>
          <Row gutter={[24, 24]} className={styles.advantagesRow}>
            {advantages.map((advantage, index) => (
              <Col xs={24} sm={12} md={12} lg={6} xl={6} key={index}>
                <Card className={styles.advantageCard} hoverable>
                  <div className={styles.advantageIconWrapper}>
                    {advantage.icon}
                  </div>
                  <Title level={4} className={styles.advantageTitle}>
                    {advantage.title}
                  </Title>
                  <Paragraph className={styles.advantageDescription}>
                    {advantage.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className={styles.section}>
        <div className={styles.sectionContentWrapper}>
          <Title level={2} className={styles.sectionTitle}>
            What Melo Helps You{" "}
            <span className={styles.gradientText1}>Achieve</span>
          </Title>
          <Paragraph className={styles.sectionDescription}>
            See how Melo can improve your day-to-day marketing work
          </Paragraph>
          <Row gutter={[24, 24]} className={styles.outcomesRow}>
            {outcomes.map((outcome, index) => (
              <Col xs={24} sm={12} md={12} lg={6} xl={6} key={index}>
                <Card className={styles.outcomeCard} hoverable>
                  <div className={styles.outcomeIconWrapper}>
                    {outcome.icon}
                  </div>
                  <Title level={4} className={styles.outcomeTitle}>
                    {outcome.title}
                  </Title>
                  <Paragraph className={styles.outcomeDescription}>
                    {outcome.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className={styles.section}>
        <div className={styles.sectionContentWrapper}>
          <Title level={2} className={styles.sectionTitle}>
            Built for <span className={styles.gradientText2}>Small Brands</span>{" "}
            and Lean Teams
          </Title>
          <Paragraph className={styles.sectionDescription}>
            Melo is designed for small businesses and marketers who need to do a
            lot with limited time and resources.
          </Paragraph>
          <Row gutter={[24, 24]} className={styles.audienceRow}>
            {targetAudiences.map((audience, index) => (
              <Col xs={24} sm={12} md={12} lg={6} xl={6} key={index}>
                <Card className={styles.audienceCard} hoverable>
                  <div className={styles.audienceIconWrapper}>
                    {audience.icon}
                  </div>
                  <Title level={4} className={styles.audienceTitle}>
                    {audience.title}
                  </Title>
                  <Paragraph className={styles.audienceDescription}>
                    {audience.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.sectionContentWrapper}>
          <Title level={2} className={styles.ctaTitle}>
            Ready to Transform Your Marketing?
          </Title>
          <Paragraph className={styles.ctaDescription}>
            Explore our prototype and see how Melo could fit into your social
            media workflow.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            onClick={handleGetStarted}
            className={styles.ctaButton}
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Team Section */}
      <section className={styles.teamSection}>
        <div className={styles.sectionContentWrapper}>
          <Title level={2} className={styles.sectionTitle}>
            Our <span className={styles.gradientText1}>Team</span>
          </Title>
          <Paragraph
            className={`${styles.sectionDescription} ${styles.teamDescription}`}
          >
            Five Master's students at University of Auckland building an AI
            marketing partner for small brands
          </Paragraph>
          <div className={styles.teamRow}>
            {[
              {
                id: 1,
                avatar: lulinYangImg,
                name: "Lulin Yang",
                role: "Backend Developer",
              },
              {
                id: 2,
                avatar: tazwarHabibImg,
                name: "Tazwar Habib",
                role: "Backend Developer",
              },
              {
                id: 3,
                avatar: kikiXingImg,
                name: "Kiki Xing",
                role: "Frontend Developer",
              },
              {
                id: 4,
                avatar: weijingZhangImg,
                name: "Weijing Zhang",
                role: "Frontend Developer",
              },
              {
                id: 5,
                avatar: xingyuanZhouImg,
                name: "Xingyuan Zhou",
                role: "Full-stack Developer",
              },
            ].map((member) => (
              <div className={styles.teamMemberWrapper} key={member.id}>
                <div className={styles.teamMemberCard}>
                  <div className={styles.teamMemberAvatar}>
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name || `Team member ${member.id}`}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <span>Avatar {member.id}</span>
                      </div>
                    )}
                  </div>
                  <Title level={4} className={styles.teamMemberName}>
                    {member.name || ""}
                  </Title>
                  <Paragraph className={styles.teamMemberRole}>
                    {member.role}
                  </Paragraph>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Paragraph className={styles.footerText}>
            © 2025 Melo. All rights reserved.
          </Paragraph>
          <Space size="large">
            <Button
              type="link"
              className={styles.footerLink}
              onClick={() => navigate("/privacy-policy")}
            >
              Privacy Policy
            </Button>
            <Button
              type="link"
              className={styles.footerLink}
              onClick={() => navigate("/terms-of-service")}
            >
              Terms of Service
            </Button>
            <Button
              type="link"
              className={styles.footerLink}
              onClick={() => navigate("/contact-us")}
            >
              Contact Us
            </Button>
          </Space>
        </div>
      </Footer>
      <AuthModal
        open={isAuthModalOpen}
        onCancel={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </Layout>
  );
}
