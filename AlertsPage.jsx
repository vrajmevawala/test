import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Send, Filter, Plus, Clock } from 'lucide-react'
import { useAlerts, useUpdateAlertStatus, useGenerateBulkAlerts } from '@/hooks/useAlerts'
import useAuthStore from '@/store/authStore'
import useLanguage from '@/hooks/useLanguage'
import AlertCard from '@/components/alerts/AlertCard'
import GenerateAlertModal from '@/components/alerts/GenerateAlertModal'
import StatCard from '@/components/dashboard/StatCard'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ALERT_PRIORITIES, ALERT_STATUSES, ALERT_DOMAINS } from '@/utils/constants'
import { cn } from '@/utils/cn'

export default function AlertsPage() {
  const [filters, setFilters] = useState({ priority: '', status: '', alert_domain: '' })
  const [showModal, setShowModal] = useState(false)
  const { user } = useAuthStore()
  const { t } = useLanguage()
  const canBulk = ['superadmin', 'org_admin'].includes(user?.role)
  const queryParams = { ...filters, limit: 50 }
  Object.keys(queryParams).forEach((k) => { if (!queryParams[k]) delete queryParams[k] })
  const { data, isLoading } = useAlerts(queryParams)
  const updateStatus = useUpdateAlertStatus()
  const bulkGen = useGenerateBulkAlerts()
  const alerts = Array.isArray(data) ? data : data?.alerts || []
  const total = data?.total || alerts.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('alerts.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('alerts.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {/* {canBulk && <Button variant="secondary" icon={Send} onClick={() => bulkGen.mutate()} loading={bulkGen.isPending}>{t('alerts.bulk_generate')}</Button>} */}
          <Button icon={Plus} onClick={() => setShowModal(true)}>{t('alerts.generate_alert')}</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label={t('alerts.total_alerts')} value={total} icon="Bell" color="blue" index={0} />
        <StatCard label={t('alerts.pending')} value={alerts.filter(a => a.status === 'pending').length} icon="Clock" color="amber" index={1} />
        <StatCard label={t('alerts.sent')} value={alerts.filter(a => a.status === 'sent').length} icon="Send" color="green" index={2} />
        <StatCard label={t('alerts.critical')} value={alerts.filter(a => a.priority === 'critical').length} icon="AlertTriangle" color="red" pulse index={3} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {['', ...ALERT_DOMAINS].map(d => (
          <button key={d} onClick={() => setFilters(f => ({ ...f, alert_domain: d }))}
            className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition capitalize',
              filters.alert_domain === d ? 'bg-[#0F4C35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {d ? t(`alerts.${d}`) || d : t('alerts.all_categories')}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {['', ...ALERT_PRIORITIES].map(p => (
          <button key={p} onClick={() => setFilters(f => ({ ...f, priority: p }))}
            className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition capitalize',
              filters.priority === p ? 'bg-[#0F4C35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {p ? t(`alerts.${p.toLowerCase()}`) || p : t('alerts.all_priorities')}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {ALERT_STATUSES.map(s => (
          <button key={s} onClick={() => setFilters(f => ({ ...f, status: f.status === s ? '' : s }))}
            className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition capitalize',
              filters.status === s ? 'bg-[#0F4C35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {t(`alerts.${s.toLowerCase()}`) || s}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : alerts.length === 0 ? (
        <EmptyState icon="inbox" title={t('alerts.no_alerts_found')} description={t('alerts.no_alerts_desc')} />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <AlertCard key={alert.id} alert={alert} index={i}
              onStatusUpdate={(id, status) => updateStatus.mutate({ id, status })} />
          ))}
        </div>
      )}
      <GenerateAlertModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
