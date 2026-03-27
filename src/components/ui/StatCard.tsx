import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type StatCardProps = {
  title: string
  value: string
  tone?: 'positive' | 'negative' | 'warning' | 'default'
  subtitle?: string
  icon?: ReactNode
  delay?: number
  trend?: { value: string; direction: 'up' | 'down' }
  children?: ReactNode
}

export function StatCard({
  title,
  value,
  tone = 'default',
  subtitle,
  icon,
  delay = 0,
  trend,
  children,
}: StatCardProps) {
  return (
    <motion.div
      className="card-saldo stat-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={{
        scale: 1.015,
        boxShadow: '0 0 0 1px var(--primary), 0 8px 32px var(--primary-glow)',
        transition: { duration: 0.18 },
      }}
    >
      {icon && (
        <div className="stat-icon-wrap">
          {icon}
        </div>
      )}

      <h3>{title}</h3>

      <div
        className={`valor tone-${tone}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </div>

      {trend && (
        <div className={`stat-trend ${trend.direction}`}>
          {trend.direction === 'up' ? '▲' : '▼'} {trend.value}
        </div>
      )}

      {subtitle && <p className="stat-subtitle">{subtitle}</p>}

      {children}
    </motion.div>
  )
}
