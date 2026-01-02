import { Layout, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import styles from "./TermsOfService.module.css";
import meloLogo from "../img/melo-logo.jpg";

const { Footer } = Layout;
const { Title, Paragraph } = Typography;

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <Layout className={styles.layout}>
      {/* Header Bar */}
      <header className={styles.headerBar}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft} onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>
            <img src={meloLogo} alt="Melo" className={styles.headerLogo} />
          </div>
          <div className={styles.headerTagline}>
            AI Social Media & Marketing Manager For Your Business
          </div>
        </div>
      </header>

      {/* Content Section */}
      <section className={styles.contentSection}>
        <div className={styles.contentWrapper}>
          <Title level={1} className={styles.pageTitle}>
            Terms of Service
          </Title>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.1 Acceptance of terms
            </Title>
            <Paragraph className={styles.paragraph}>
              By accessing or using Melo, you confirm that you agree to these Terms of Service and our
              Privacy Policy. If you do not agree, please do not use the service.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.2 Prototype and non-commercial use
            </Title>
            <Paragraph className={styles.paragraph}>
              Melo is a student project and an experimental prototype. It is provided "as is" for learning,
              research, and demonstration purposes only. You may not rely on Melo for critical decisions (for
              example, medical, legal, or financial advice) or for high-risk business operations.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.3 Your account and responsibilities
            </Title>
            <Paragraph className={styles.paragraph}>
              You are responsible for:
            </Paragraph>
            <ul className={styles.list}>
              <li>Maintaining the confidentiality of any login credentials.</li>
              <li>Ensuring that all information you provide is accurate and up to date.</li>
              <li>All activities that occur under your account or device.</li>
            </ul>
            <Paragraph className={styles.paragraph}>
              If you suspect unauthorised use of your account, please contact us promptly.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.4 License and permitted use
            </Title>
            <Paragraph className={styles.paragraph}>
              We grant you a limited, revocable, non-exclusive, non-transferable licence to access and use
              Melo for personal or internal business use in connection with our course project. You may:
            </Paragraph>
            <ul className={styles.list}>
              <li>Create, edit, and download content generated with Melo.</li>
              <li>Use outputs in your own projects, presentations, or marketing experiments, as long as you
                comply with these terms and with any third-party rights.</li>
            </ul>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.5 Acceptable use
            </Title>
            <Paragraph className={styles.paragraph}>
              You agree <strong>not</strong> to use Melo to:
            </Paragraph>
            <ul className={styles.list}>
              <li>Break any laws or regulations.</li>
              <li>Generate, store, or distribute harmful, abusive, defamatory, or illegal content.</li>
              <li>Attempt to reverse-engineer, decompile, or extract the underlying models or code.</li>
              <li>Interfere with or disrupt the service or its infrastructure.</li>
              <li>Automate access (for example, through scraping or bots) without our written permission.</li>
            </ul>
            <Paragraph className={styles.paragraph}>
              We may suspend or terminate your access if you breach these rules.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.6 Intellectual property
            </Title>
            <Paragraph className={styles.paragraph}>
              <strong>Our content:</strong> Melo (including its code, design, and documentation) is owned by our student team
              and/or the University of Auckland.
            </Paragraph>
            <Paragraph className={styles.paragraph}>
              <strong>Your content:</strong> You retain ownership of any original inputs you provide and the outputs you
              generate, subject to any rights of third parties and limitations of the underlying AI models.
            </Paragraph>
            <Paragraph className={styles.paragraph}>
              By using Melo, you grant us a non-exclusive licence to host and process your inputs and outputs
              solely to provide and improve the service.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.7 Disclaimers
            </Title>
            <Paragraph className={styles.paragraph}>
              Melo is provided "as is" without any warranties, express or implied, including warranties of
              accuracy, reliability, merchantability, or fitness for a particular purpose. AI-generated content
              may be incomplete, inaccurate, or biased. You are responsible for reviewing and verifying any
              outputs before using them.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.8 Limitation of liability
            </Title>
            <Paragraph className={styles.paragraph}>
              To the maximum extent permitted by law, we (the student team and the University of Auckland)
              are not liable for any indirect, incidental, special, consequential, or punitive damages arising
              from your use of Melo. Our total liability is limited to the amount you have paid us (if any)
              for access to Melo, which is typically zero.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.9 Changes and termination
            </Title>
            <Paragraph className={styles.paragraph}>
              We may modify these Terms of Service at any time. Continued use after changes constitutes
              acceptance of the new terms. We may also discontinue or modify Melo at any time without notice.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              2.10 Governing law
            </Title>
            <Paragraph className={styles.paragraph}>
              These terms are governed by the laws of New Zealand. Any disputes will be resolved in the courts
              of New Zealand.
            </Paragraph>
          </div>

          <div className={styles.backLink} onClick={() => navigate("/home")}>
            ← Back to Home
          </div>
        </div>
      </section>

      <Footer className={styles.footer}>
        <div className={styles.footerContent}>
          <Paragraph className={styles.footerText}>
            © 2025 Melo. All rights reserved.
          </Paragraph>
        </div>
      </Footer>
    </Layout>
  );
}

