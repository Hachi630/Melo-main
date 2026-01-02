import { Layout, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import styles from "./PrivacyPolicy.module.css";
import meloLogo from "../img/melo-logo.jpg";

const { Footer } = Layout;
const { Title, Paragraph } = Typography;

export default function PrivacyPolicy() {
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
            Privacy Policy
          </Title>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.1 Who we are
            </Title>
            <Paragraph className={styles.paragraph}>
              Melo is an AI-powered social media and marketing assistant built by a student team at the
              University of Auckland. This product is currently a prototype for educational and research
              purposes only.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.2 What data we collect
            </Title>
            <Paragraph className={styles.paragraph}>
              Depending on how you use Melo, we may collect:
            </Paragraph>
            <ul className={styles.list}>
              <li>
                <strong>Account & contact information</strong> – such as your name or nickname, email address, and
                organisation (if you choose to provide them).
              </li>
              <li>
                <strong>Usage data</strong> – such as prompts you type, content you upload, examples you generate,
                timestamps, and basic logs about how you interact with the product.
              </li>
              <li>
                <strong>Technical data</strong> – such as browser type, device information, approximate location based
                on IP address, and cookies or similar technologies used to keep you signed in and
                remember your preferences.
              </li>
              <li>
                <strong>Feedback</strong> – such as ratings, comments, or bug reports you share with us.
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.3 How we use your data
            </Title>
            <Paragraph className={styles.paragraph}>
              We use the data described above to:
            </Paragraph>
            <ul className={styles.list}>
              <li>Provide, operate, and maintain Melo's core features.</li>
              <li>Improve our models, prompts, and user experience (for example, by analysing
                anonymised logs to understand common workflows and problems).</li>
              <li>Ensure security, prevent abuse, and debug technical issues.</li>
              <li>Communicate with you about updates, issues, or support requests.</li>
            </ul>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.4 Third-party AI and service providers
            </Title>
            <Paragraph className={styles.paragraph}>
              To power Melo, we may send your inputs and generated content to trusted third-party AI
              providers (for example, large language model APIs) and infrastructure services (such as cloud
              hosting, analytics, or logging). These providers process data on our behalf under their own
              privacy and security policies.
            </Paragraph>
            <Paragraph className={styles.paragraph}>
              We do <strong>not</strong> sell your personal information, and we use third-party services only to operate and
              improve this prototype.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.5 Data retention & security
            </Title>
            <Paragraph className={styles.paragraph}>
              We store data only for as long as needed to provide the service, to analyse usage for our course
              project, or to meet any legal or university requirements. We apply reasonable technical and
              organisational measures (such as access controls and encryption offered by our cloud providers)
              to protect your data. However, no system can be perfectly secure.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.6 Your choices
            </Title>
            <Paragraph className={styles.paragraph}>
              Because Melo is a prototype, we handle requests manually where possible. You can contact us to:
            </Paragraph>
            <ul className={styles.list}>
              <li>Ask what data about you we hold.</li>
              <li>Request correction or deletion of certain data, where feasible.</li>
              <li>Ask us to stop using your data for model or product improvement.</li>
            </ul>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.7 Children
            </Title>
            <Paragraph className={styles.paragraph}>
              Melo is not intended for children under 13 years old. If you are under 18, you should only use
              Melo with permission from a parent, guardian, or teacher. If you believe a child has provided us
              with personal data, please contact us so we can delete it.
            </Paragraph>
          </div>

          <div className={styles.section}>
            <Title level={2} className={styles.sectionTitle}>
              1.8 Changes to this policy
            </Title>
            <Paragraph className={styles.paragraph}>
              We may update this Privacy Policy from time to time. When we make material changes, we will
              update the "last updated" date and, where reasonable, highlight the changes in the interface.
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

