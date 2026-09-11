import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button/Button';
import { Card } from '../components/ui/Card/Card';
import { Bot, ShieldCheck, Cpu } from 'lucide-react';
import styles from './LandingPage.module.css';

export const LandingPage = () => {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          The Automated <span>Development</span> Agent
        </h1>
        <p className={styles.subtitle}>
          DEVAA autonomously orchestrates requirement gathering, architecture planning, and development sprints through multi-agent collaboration.
        </p>
        <div className={styles.actions}>
          <Link to="/login">
            <Button size="lg">Access Workspace</Button>
          </Link>
          <a href="#features">
            <Button variant="secondary" size="lg">Learn More</Button>
          </a>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <Card>
          <Card.Content>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-orange-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} /> Multi-Agent Workflow
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Dedicated agents for Requirements, Architecture, Development, and QA working in perfect unison.
            </p>
          </Card.Content>
        </Card>
        
        <Card>
          <Card.Content>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-orange-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} /> Role-Based Context
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Persona-driven interfaces tailor the experience for Product Owners, Engineering Leads, and QA Reviewers.
            </p>
          </Card.Content>
        </Card>
        
        <Card>
          <Card.Content>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-orange-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} /> Dynamic LLM Routing
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Seamlessly switch between Google Gemini, OpenAI, and Local LLMs depending on the task complexity and cost.
            </p>
          </Card.Content>
        </Card>
      </section>
    </div>
  );
};
