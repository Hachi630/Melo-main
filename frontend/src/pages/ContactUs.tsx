import { Layout, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import styles from "./ContactUs.module.css";
import meloLogo from "../img/melo-logo.jpg";

const { Footer } = Layout;
const { Title, Paragraph } = Typography;

export default function ContactUs() {
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
            Contact Us
          </Title>

          <div className={styles.section}>
            <Paragraph className={styles.paragraph}>
              If you have questions about these Terms, our Privacy Policy, or how Melo handles your data,
              you can contact the project team at:
            </Paragraph>
          </div>

          <div className={styles.section}>
            <ul className={styles.list}>
              <li>
                <strong>Lulin Yang (Team Leader)</strong> &nbsp; Email: <a href="mailto:lyan608@aucklanduni.ac.nz" className={styles.emailLink}>lyan608@aucklanduni.ac.nz</a>
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <Paragraph className={styles.paragraph}>
              We will do our best to respond within a reasonable time.
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

