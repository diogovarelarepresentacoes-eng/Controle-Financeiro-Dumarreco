import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type StatCardProps = {
  title: string
  value: string
  tone?: 'positive' | 'negative' | 'warning' | 'default'
  subtitle?: string
  children?: ReactNode
}

export function StatCard({ title, value, tone = 'default', subtitle, children }: StatCardProps) {
  return (
    <motion.div
      className="card-saldo stat-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h3>{title}</h3>
      <div className={`valor tone-${tone}`}>{value}</div>
      {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      {children}
    </motion.div>
  )
}
