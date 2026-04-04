import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Building2, Bell, Shield, Save, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import useLanguage from '@/hooks/useLanguage'
import Card, { CardTitle, CardDescription } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { LANGUAGES } from '@/utils/constants'
import { cn } from '@/utils/cn'
import * as authApi from '@/api/auth.api'

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const { user, setUser } = useAuthStore()
  const { language, setLanguage, t } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      name: formData.get('name'),
      preferred_language: language
    }

    try {
      setIsSaving(true)
      const res = await authApi.updateProfile(data)
      setUser(res.data.data)
      toast.success(t('common.success') || 'Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const settingsTabs = [
    { key: 'profile', label: t('settings.profile'), icon: User },
    { key: 'organization', label: t('settings.organization'), icon: Building2 },
    { key: 'notifications', label: t('settings.notifications'), icon: Bell },
    { key: 'security', label: t('settings.security'), icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
      </div>

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0 space-y-0.5">
          {settingsTabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                tab === t.key ? 'bg-[#0F4C35]/10 text-[#0F4C35]' : 'text-gray-500 hover:bg-gray-50')}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'profile' && (
              <Card>
                <CardTitle>{t('settings.profile')}</CardTitle>
                <CardDescription>{t('settings.subtitle')}</CardDescription>
                <form onSubmit={handleSaveProfile} className="mt-6 space-y-4 max-w-lg">
                  <Input 
                    label="Full name" 
                    name="name" 
                    defaultValue={user?.name || ''} 
                    required 
                  />
                  <Input 
                    label="Email address" 
                    type="email" 
                    defaultValue={user?.email || ''} 
                    disabled 
                  />
                  <Select 
                    label={t('settings.language')} 
                    options={LANGUAGES} 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)} 
                  />
                  <Button type="submit" icon={isSaving ? Loader2 : Save} disabled={isSaving}>
                    {isSaving ? 'Saving...' : t('common.save')}
                  </Button>
                </form>
              </Card>
            )}
            {tab === 'organization' && (
              <Card>
                <CardTitle>{t('settings.organization')}</CardTitle>
                <CardDescription>{t('settings.org_desc')}</CardDescription>
                <div className="mt-6 space-y-4 max-w-lg">
                  <Input 
                    label={t('settings.org_name')} 
                    defaultValue={user?.organization?.name || 'Rural Cooperative Bank'} 
                    disabled={user?.role === 'field_officer'}
                  />
                  <Input 
                    label={t('settings.org_type')} 
                    defaultValue={user?.organization?.type || 'Cooperative Bank'} 
                    disabled 
                  />
                  <Input 
                    label={t('settings.primary_district')} 
                    defaultValue={user?.organization?.location || 'Ahmedabad'} 
                    disabled={user?.role === 'field_officer'}
                  />
                  <Input 
                    label={t('settings.contact_email')} 
                    defaultValue={user?.organization?.email || 'admin@ruralcoopbank.in'} 
                    disabled={user?.role === 'field_officer'}
                  />
                  {user?.role !== 'field_officer' && (
                    <Button icon={Save} onClick={() => toast.error('Organization updates not yet implemented')}>
                      {t('common.save')}
                    </Button>
                  )}
                </div>
              </Card>
            )}
            {tab === 'notifications' && (
              <Card>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>Choose what alerts you receive</CardDescription>
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'Critical vulnerability alerts', desc: 'Get notified when farmers cross critical threshold', default: true },
                    { label: 'Loan due reminders', desc: 'Alerts for upcoming loan repayment dates', default: true },
                    { label: 'Insurance expiry warnings', desc: 'Notifications before insurance policies expire', default: true },
                    { label: 'Weekly digest', desc: 'Summary of farmer portfolio health every Monday', default: false },
                    { label: 'New scheme notifications', desc: 'When new government schemes become available', default: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#0F4C35]/20 rounded-full peer peer-checked:bg-[#0F4C35] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {tab === 'security' && (
              <Card>
                <CardTitle>Security</CardTitle>
                <CardDescription>Update your password and security settings</CardDescription>
                <div className="mt-6 space-y-4 max-w-lg">
                  <Input label="Current password" type="password" />
                  <Input label="New password" type="password" />
                  <Input label="Confirm new password" type="password" />
                  <Button icon={Shield}>Update password</Button>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
