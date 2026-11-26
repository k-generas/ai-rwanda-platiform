import React, { useCallback, useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  BOOTSTRAPPED_SUPERADMIN_EMAILS,
  db,
  handleFirestoreError,
  isBootstrappedSuperadminEmail,
  OperationType
} from '../../firebase';
import type {
  MaskedGatewayConfig,
  PermissionKey,
  PlatformSettings,
  ServerPerformanceMetrics,
  StaffRole,
  StaffRoleRecord
} from '../../types';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_DISPLAY
} from '../../lib/permissions';
import { downloadCsv, downloadJson } from '../../lib/csvExport';
import type { AuditWriteParams, ControlCenterData } from './ControlCenterTypes';

interface StaffAndSecurityPanelProps {
  section: 'staff' | 'audit' | 'settings' | 'security';
  user: User;
  data: ControlCenterData;
  onWriteAudit: (params: AuditWriteParams) => Promise<void>;
  onRefreshData: () => Promise<void>;
}

export function StaffAndSecurityPanel({
  section,
  user,
  data,
  onWriteAudit,
  onRefreshData
}: StaffAndSecurityPanelProps) {
  const { users, staffRoles, courses, enrollments, payments, auditLogs, settings, integrations, access } = data;

  // Staff assignment state
  const [selectedUserUid, setSelectedUserUid] = useState<string>('');
  const [staffEmailInput, setStaffEmailInput] = useState<string>('');
  const [staffNameInput, setStaffNameInput] = useState<string>('');
  const [assignedRole, setAssignedRole] = useState<Exclude<StaffRole, 'learner'>>('instructor');
  const [selectedPerms, setSelectedPerms] = useState<PermissionKey[]>(DEFAULT_ROLE_PERMISSIONS.instructor);
  const [assignedCourses, setAssignedCourses] = useState<string[]>(['challenge-28']);
  const [staffStatus, setStaffStatus] = useState<'active' | 'suspended'>('active');
  const [roleReason, setRoleReason] = useState('');
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffMsg, setStaffMsg] = useState<string | null>(null);

  // Audit filter state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCollectionFilter, setAuditCollectionFilter] = useState('all');

  // Platform settings state
  const [platformName, setPlatformName] = useState(settings?.platformName ?? 'AI Education Rwanda');
  const [defaultLanguage, setDefaultLanguage] = useState<'en' | 'rw'>(settings?.defaultLanguage ?? 'en');
  const [allowSelfReg, setAllowSelfReg] = useState(settings?.allowSelfRegistration ?? true);
  const [maintenanceMode, setMaintenanceMode] = useState(settings?.maintenanceMode ?? false);
  const [enablePublicVerify, setEnablePublicVerify] = useState(settings?.enablePublicVerify ?? true);
  const [enableWaitlists, setEnableWaitlists] = useState(settings?.enableWaitlists ?? true);
  const [enableSupportTickets, setEnableSupportTickets] = useState(
    settings?.enableSupportTickets ?? true
  );
  const [enableCoupons, setEnableCoupons] = useState(settings?.enableCoupons ?? true);
  const [certOrgName, setCertOrgName] = useState(
    settings?.certificateOrgName ?? 'AI Education Rwanda'
  );
  const [certSigName, setCertSigName] = useState(
    settings?.certificateSignatoryName ?? 'Academic & Program Board'
  );
  const [certSigTitle, setCertSigTitle] = useState(
    settings?.certificateSignatoryTitle ?? 'Director of AI Education'
  );
  const [certMinQuiz, setCertMinQuiz] = useState(settings?.certificateMinQuizAvg ?? 70);
  const [certMinProj, setCertMinProj] = useState(settings?.certificateMinProjectScore ?? 70);
  const [settingsReason, setSettingsReason] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // Superadmin Encrypted Gateway Vault + Performance Metrics state
  const [gatewayMasked, setGatewayMasked] = useState<MaskedGatewayConfig | null>(null);
  const [activeGatewayTab, setActiveGatewayTab] = useState<'momo' | 'airtel' | 'email' | 'sms'>('momo');
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [gatewayTestMsg, setGatewayTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [gatewaySaveMsg, setGatewaySaveMsg] = useState<string | null>(null);

  // MTN MoMo draft fields (secret inputs remain empty unless user enters new secrets)
  const [momoEnabled, setMomoEnabled] = useState(false);
  const [momoEnv, setMomoEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [momoCurrency, setMomoCurrency] = useState<'RWF' | 'EUR'>('RWF');
  const [momoMerchantMsisdn, setMomoMerchantMsisdn] = useState('');
  const [momoApiUser, setMomoApiUser] = useState('');
  const [momoApiKey, setMomoApiKey] = useState('');
  const [momoSubKey, setMomoSubKey] = useState('');
  const [momoCallbackSecret, setMomoCallbackSecret] = useState('');

  // Airtel Money draft fields
  const [airtelEnabled, setAirtelEnabled] = useState(false);
  const [airtelEnv, setAirtelEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [airtelClientId, setAirtelClientId] = useState('');
  const [airtelClientSecret, setAirtelClientSecret] = useState('');
  const [airtelCallbackSecret, setAirtelCallbackSecret] = useState('');

  // Email draft fields
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailProvider, setEmailProvider] = useState<'resend' | 'smtp'>('resend');
  const [emailFrom, setEmailFrom] = useState('noreply@aieducation.rw');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // SMS draft fields
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState<'africastalking' | 'twilio' | 'custom'>('africastalking');
  const [smsSenderId, setSmsSenderId] = useState('AIEDU_RW');
  const [smsUsername, setSmsUsername] = useState('');
  const [smsApiKey, setSmsApiKey] = useState('');

  // Server performance & concurrency telemetry
  const [metrics, setMetrics] = useState<ServerPerformanceMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const loadSuperadminServerPanels = useCallback(async () => {
    if (!access.isSuperadmin || section !== 'settings') return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [intRes, metRes] = await Promise.all([
        fetch('/api/admin/integrations', { headers }),
        fetch('/api/admin/metrics', { headers })
      ]);
      if (intRes.ok) {
        const cfg = (await intRes.json()) as MaskedGatewayConfig;
        setGatewayMasked(cfg);
        setMomoEnabled(cfg.momo.enabled);
        setMomoEnv(cfg.momo.environment);
        setMomoCurrency(cfg.momo.targetCurrency);
        setMomoMerchantMsisdn(cfg.momo.merchantMsisdn);
        setAirtelEnabled(cfg.airtel.enabled);
        setAirtelEnv(cfg.airtel.environment);
        setEmailEnabled(cfg.email.enabled);
        setEmailProvider(cfg.email.provider);
        setEmailFrom(cfg.email.fromEmail);
        setSmtpHost(cfg.email.smtpHost);
        setSmtpPort(cfg.email.smtpPort || 587);
        setSmsEnabled(cfg.sms.enabled);
        setSmsProvider(cfg.sms.provider);
        setSmsSenderId(cfg.sms.senderId);
        setSmsUsername(cfg.sms.username);
      }
      if (metRes.ok) {
        setMetrics((await metRes.json()) as ServerPerformanceMetrics);
      } else {
        setMetricsError('Unable to fetch live server metrics.');
      }
    } catch {
      setMetricsError('Server metrics unavailable.');
    } finally {
      setMetricsLoading(false);
    }
  }, [access.isSuperadmin, section, user]);

  useEffect(() => {
    void loadSuperadminServerPanels();
  }, [loadSuperadminServerPanels]);

  const handleSaveGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access.isSuperadmin) return;
    setGatewayBusy(true);
    setGatewaySaveMsg(null);
    setGatewayTestMsg(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          momo: {
            enabled: momoEnabled,
            environment: momoEnv,
            targetCurrency: momoCurrency,
            merchantMsisdn: momoMerchantMsisdn,
            ...(momoApiUser.trim() ? { apiUser: momoApiUser.trim() } : {}),
            ...(momoApiKey.trim() ? { apiKey: momoApiKey.trim() } : {}),
            ...(momoSubKey.trim() ? { subscriptionKey: momoSubKey.trim() } : {}),
            ...(momoCallbackSecret.trim() ? { callbackSecret: momoCallbackSecret.trim() } : {})
          },
          airtel: {
            enabled: airtelEnabled,
            environment: airtelEnv,
            ...(airtelClientId.trim() ? { clientId: airtelClientId.trim() } : {}),
            ...(airtelClientSecret.trim() ? { clientSecret: airtelClientSecret.trim() } : {}),
            ...(airtelCallbackSecret.trim() ? { callbackSecret: airtelCallbackSecret.trim() } : {})
          },
          email: {
            enabled: emailEnabled,
            provider: emailProvider,
            fromEmail: emailFrom,
            smtpHost,
            smtpPort: Number(smtpPort) || 587,
            ...(emailApiKey.trim() ? { apiKey: emailApiKey.trim() } : {}),
            ...(smtpUser.trim() ? { smtpUser: smtpUser.trim() } : {}),
            ...(smtpPass.trim() ? { smtpPass: smtpPass.trim() } : {})
          },
          sms: {
            enabled: smsEnabled,
            provider: smsProvider,
            senderId: smsSenderId,
            username: smsUsername,
            ...(smsApiKey.trim() ? { apiKey: smsApiKey.trim() } : {})
          }
        })
      });

      const json = await res.json();
      if (!res.ok) {
        setGatewaySaveMsg(json.error || 'Could not save gateway credentials.');
      } else {
        setGatewayMasked(json.config as MaskedGatewayConfig);
        setMomoApiUser('');
        setMomoApiKey('');
        setMomoSubKey('');
        setMomoCallbackSecret('');
        setAirtelClientId('');
        setAirtelClientSecret('');
        setAirtelCallbackSecret('');
        setEmailApiKey('');
        setSmtpUser('');
        setSmtpPass('');
        setSmsApiKey('');

        await setDoc(
          doc(db, 'platformSettings', 'public'),
          {
            id: 'public',
            platformName: platformName.trim() || 'AI Education Rwanda',
            defaultLanguage,
            allowSelfRegistration: allowSelfReg,
            maintenanceMode,
            momoIntegrationActive: Boolean(json.status?.momoActive),
            airtelIntegrationActive: Boolean(json.status?.airtelActive),
            emailProviderActive: Boolean(json.status?.emailActive),
            smsProviderActive: Boolean(json.status?.smsActive),
            updatedBy: user.email || user.uid,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        await onWriteAudit({
          action: 'UPDATE_GATEWAY_CREDENTIALS',
          targetCollection: 'platformSettings',
          targetId: 'gateway_vault',
          newState: `momo=${Boolean(json.status?.momoActive)}, airtel=${Boolean(json.status?.airtelActive)}, email=${Boolean(json.status?.emailActive)}`,
          reason: 'Superadmin encrypted gateway vault update',
          summary: `Updated encrypted gateway configuration (${activeGatewayTab})`
        });

        setGatewaySaveMsg('Encrypted gateway credentials saved cleanly on server.');
        await onRefreshData();
      }
    } catch {
      setGatewaySaveMsg('Failed to communicate with server gateway vault.');
    } finally {
      setGatewayBusy(false);
    }
  };

  const handleTestGateway = async (target: 'momo' | 'airtel' | 'email' | 'sms') => {
    setGatewayBusy(true);
    setGatewayTestMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target })
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      setGatewayTestMsg({
        ok: Boolean(json.ok),
        text: json.message || 'Test completed.'
      });
    } catch {
      setGatewayTestMsg({ ok: false, text: 'Connection test failed.' });
    } finally {
      setGatewayBusy(false);
    }
  };

  const handlePickExistingUser = (uid: string) => {
    setSelectedUserUid(uid);
    const u = users.find((x) => x.uid === uid);
    if (u) {
      setStaffEmailInput(u.email);
      setStaffNameInput(u.displayName);
      const existingRole = staffRoles.find((r) => r.uid === uid);
      if (existingRole) {
        setAssignedRole(existingRole.role);
        setSelectedPerms(existingRole.permissions);
        setAssignedCourses(existingRole.assignedCourseIds);
        setStaffStatus(existingRole.status);
      } else {
        const nextRole: Exclude<StaffRole, 'learner'> =
          u.role === 'learner' ? 'instructor' : u.role;
        setAssignedRole(nextRole);
        setSelectedPerms(DEFAULT_ROLE_PERMISSIONS[nextRole]);
        setAssignedCourses(['challenge-28']);
        setStaffStatus('active');
      }
    }
  };

  const handleSaveStaffRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access.isSuperadmin) return;
    const uid = selectedUserUid.trim();
    if (!uid) {
      setStaffMsg('Select an existing registered user account from the dropdown first.');
      return;
    }
    if (
      isBootstrappedSuperadminEmail(staffEmailInput) &&
      (assignedRole !== 'superadmin' || staffStatus !== 'active')
    ) {
      setStaffMsg(
        'Protected Founder Superadmin accounts cannot be downgraded or suspended.'
      );
      return;
    }

    setStaffBusy(true);
    setStaffMsg(null);
    const prevRecord = staffRoles.find((r) => r.uid === uid);
    const prevRole = prevRecord?.role ?? users.find((u) => u.uid === uid)?.role ?? 'learner';

    try {
      const batch = writeBatch(db);
      const staffDoc: Omit<StaffRoleRecord, 'createdAt' | 'updatedAt'> = {
        uid,
        email: staffEmailInput.trim(),
        displayName: staffNameInput.trim() || 'Staff Member',
        role: assignedRole,
        permissions: assignedRole === 'superadmin' ? ALL_PERMISSIONS : selectedPerms,
        assignedCourseIds: assignedCourses,
        status: staffStatus,
        updatedBy: user.email || user.uid
      };

      batch.set(doc(db, 'staffRoles', uid), {
        ...staffDoc,
        createdAt: prevRecord?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const targetUser = users.find((u) => u.uid === uid);
      if (targetUser) {
        batch.set(
          doc(db, 'users', uid),
          {
            role: assignedRole,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }

      await batch.commit();

      await onWriteAudit({
        action: 'ASSIGN_STAFF_ROLE',
        targetCollection: 'staffRoles',
        targetId: uid,
        previousState: `${prevRole} (${prevRecord?.status ?? 'none'})`,
        newState: `${assignedRole} (${staffStatus})`,
        reason: roleReason.trim() || 'Superadmin staff permission assignment',
        summary: `Assigned ${assignedRole} role to ${staffEmailInput} (${selectedPerms.length} permissions)`
      });

      setRoleReason('');
      setStaffMsg(`Saved role ${assignedRole} for ${staffEmailInput}.`);
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `staffRoles/${uid}`);
    } finally {
      setStaffBusy(false);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access.isSuperadmin) return;
    setSettingsBusy(true);
    setSettingsMsg(null);

    try {
      const payload: PlatformSettings = {
        id: 'public',
        platformName: platformName.trim() || 'AI Education Rwanda',
        defaultLanguage,
        allowSelfRegistration: allowSelfReg,
        maintenanceMode,
        momoIntegrationActive: integrations.momoActive,
        airtelIntegrationActive: integrations.airtelActive,
        emailProviderActive: integrations.emailActive,
        smsProviderActive: integrations.smsActive,
        enablePublicVerify,
        enableWaitlists,
        enableSupportTickets,
        enableCoupons,
        certificateOrgName: certOrgName.trim() || 'AI Education Rwanda',
        certificateSignatoryName: certSigName.trim() || 'Academic & Program Board',
        certificateSignatoryTitle: certSigTitle.trim() || 'Director of AI Education',
        certificateMinQuizAvg: Number(certMinQuiz),
        certificateMinProjectScore: Number(certMinProj),
        updatedBy: user.email || user.uid
      };

      await setDoc(doc(db, 'platformSettings', 'public'), {
        ...payload,
        updatedAt: serverTimestamp()
      });

      await onWriteAudit({
        action: 'UPDATE_PLATFORM_SETTINGS',
        targetCollection: 'platformSettings',
        targetId: 'public',
        previousState: settings
          ? `lang=${settings.defaultLanguage}, selfReg=${settings.allowSelfRegistration}, maint=${settings.maintenanceMode}`
          : 'default',
        newState: `lang=${defaultLanguage}, selfReg=${allowSelfReg}, maint=${maintenanceMode}`,
        reason: settingsReason.trim() || 'Platform configuration update',
        summary: `Updated platform settings (${platformName})`
      });

      setSettingsReason('');
      setSettingsMsg('Platform settings saved to Firestore.');
      await onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'platformSettings/public');
    } finally {
      setSettingsBusy(false);
    }
  };

  if (section === 'staff') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              Assign Staff Role & Granular Permissions
            </h2>
            <p className="text-sm text-[#5D5D66] mt-1">
              Only Superadmin can grant, modify, or suspend staff roles. Learners cannot self-elevate.
            </p>
          </div>

          {!access.isSuperadmin ? (
            <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-xl p-4 text-sm text-[#5D5D66]">
              Role assignment requires Superadmin privileges. You have read-only access to the staff directory.
            </div>
          ) : (
            <form onSubmit={handleSaveStaffRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                  Select Registered User Account
                </label>
                <select
                  value={selectedUserUid}
                  onChange={(e) => handlePickExistingUser(e.target.value)}
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
                >
                  <option value="">-- Choose user --</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.email}) — {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0D0D0F] mb-1">Role</label>
                  <select
                    value={assignedRole}
                    onChange={(e) => {
                      const next = e.target.value as Exclude<StaffRole, 'learner'>;
                      setAssignedRole(next);
                      setSelectedPerms(DEFAULT_ROLE_PERMISSIONS[next]);
                    }}
                    className="w-full px-3 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
                  >
                    {(
                      [
                        'superadmin',
                        'admin',
                        'course_manager',
                        'instructor',
                        'reviewer',
                        'support_staff'
                      ] as const
                    ).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_DISPLAY[r].en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0D0D0F] mb-1">Status</label>
                  <select
                    value={staffStatus}
                    onChange={(e) => setStaffStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full px-3 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0D0D0F] mb-2">
                  Granular Permissions ({selectedPerms.length} selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-black/[0.08] rounded-xl bg-[#F9F9FB]">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked =
                      assignedRole === 'superadmin' || selectedPerms.includes(perm);
                    return (
                      <label
                        key={perm}
                        className="flex items-center gap-2 text-sm text-[#0D0D0F] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={assignedRole === 'superadmin'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPerms((prev) => Array.from(new Set([...prev, perm])));
                            } else {
                              setSelectedPerms((prev) => prev.filter((p) => p !== perm));
                            }
                          }}
                        />
                        <span>{PERMISSION_LABELS[perm]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0D0D0F] mb-2">
                  Assigned Courses Scope
                </label>
                <div className="flex flex-wrap gap-2">
                  {courses.map((c) => {
                    const active = assignedCourses.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setAssignedCourses((prev) =>
                            active ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          )
                        }
                        className={`px-3 py-1.5 text-sm rounded-lg border ${
                          active
                            ? 'bg-[#0D0D0F] text-white border-[#0D0D0F]'
                            : 'bg-white text-[#5D5D66] border-black/15'
                        }`}
                      >
                        {c.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                  Reason for Assignment (recorded in Audit Log)
                </label>
                <input
                  type="text"
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="e.g. Onboarding instructor for Week 2 cohort"
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
                />
              </div>

              {staffMsg && <p className="text-sm text-[#0D7A5F] font-medium">{staffMsg}</p>}

              <button
                type="submit"
                disabled={staffBusy}
                className="w-full px-4 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg"
              >
                {staffBusy ? 'Saving...' : 'Save Staff Role & Permissions'}
              </button>
            </form>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
          <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
            Active Staff & Role Matrix
          </h2>
          <div className="bg-[#F2FBF8] border border-[#0D7A5F]/20 rounded-xl p-4 space-y-1.5 text-sm">
            <p className="font-mono font-semibold text-[#0D7A5F] uppercase">
              Protected Founder Superadmins
            </p>
            {BOOTSTRAPPED_SUPERADMIN_EMAILS.map((adminEmail) => (
              <p key={adminEmail} className="font-mono text-[#0D0D0F]">
                {adminEmail} · Full Platform Governance
              </p>
            ))}
          </div>
          {staffRoles.length === 0 ? (
            <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-5 text-sm text-[#5D5D66]">
              No delegated team members assigned yet. Assign team members using the form.
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {staffRoles.map((sr) => (
                <div key={sr.uid} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-medium text-[#0D0D0F]">
                      {sr.displayName} · <span className="font-mono text-sm">{sr.email}</span>
                    </p>
                    <span className="text-sm font-mono uppercase text-[#0D7A5F]">
                      {sr.role} ({sr.status})
                    </span>
                  </div>
                  <p className="text-sm text-[#5D5D66]">
                    {sr.permissions.length} permission(s) · Courses:{' '}
                    {sr.assignedCourseIds.length > 0 ? sr.assignedCourseIds.join(', ') : 'All'}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-black/[0.08]">
            <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F] mb-2">7-Role Definitions</h3>
            <div className="space-y-1.5 text-sm text-[#5D5D66]">
              {(Object.keys(ROLE_DISPLAY) as StaffRole[]).map((roleKey) => (
                <p key={roleKey}>
                  <strong className="text-[#0D0D0F]">{ROLE_DISPLAY[roleKey].en}:</strong>{' '}
                  {ROLE_DISPLAY[roleKey].description}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'audit') {
    const collections = Array.from(new Set(auditLogs.map((l) => l.targetCollection)));
    const filteredLogs = auditLogs.filter((l) => {
      const matchesCollection =
        auditCollectionFilter === 'all' || l.targetCollection === auditCollectionFilter;
      const q = auditSearch.trim().toLowerCase();
      const matchesQ =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.actorEmail.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        (l.reason ?? '').toLowerCase().includes(q);
      return matchesCollection && matchesQ;
    });

    return (
      <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
              Immutable Audit Logs
            </h2>
            <p className="text-sm text-[#5D5D66]">
              {access.isSuperadmin
                ? 'Superadmin Global Oversight: all role assignments, suspensions, access grants, payment verifications, and refunds.'
                : 'Row-Level Security Active: showing only actions performed by your account.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `ai-education-rwanda-audit-logs-${Date.now()}.csv`,
                ['ID', 'Actor', 'Role', 'Action', 'Collection', 'Target ID', 'Previous', 'New', 'Reason', 'Summary'],
                filteredLogs.map((l) => [
                  l.id,
                  l.actorEmail,
                  l.actorRole ?? '',
                  l.action,
                  l.targetCollection,
                  l.targetId,
                  l.previousState ?? '',
                  l.newState ?? '',
                  l.reason ?? '',
                  l.summary
                ])
              )
            }
            className="px-3.5 py-2 text-sm font-medium border border-black/15 rounded-lg hover:border-black/30 whitespace-nowrap shrink-0"
          >
            Export Audit CSV
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            placeholder="Filter by actor email, action, or reason..."
            className="flex-1 px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
          />
          <select
            value={auditCollectionFilter}
            onChange={(e) => setAuditCollectionFilter(e.target.value)}
            className="px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
          >
            <option value="all">All Collections</option>
            {collections.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/[0.08] text-[#5D5D66]">
                <th className="py-2.5 pr-4 font-medium">Action</th>
                <th className="py-2.5 pr-4 font-medium">Actor</th>
                <th className="py-2.5 pr-4 font-medium">Target</th>
                <th className="py-2.5 pr-4 font-medium">State Transition</th>
                <th className="py-2.5 pr-4 font-medium">Reason & Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5D5D66]">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="py-3 pr-4 font-mono font-medium text-[#0D0D0F] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 pr-4 text-[#5D5D66]">
                      <div>{log.actorEmail}</div>
                      {log.actorRole && (
                        <div className="font-mono text-sm">{log.actorRole}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[#5D5D66]">
                      {log.targetCollection}/{log.targetId}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[#0D0D0F]">
                      {log.previousState || log.newState
                        ? `${log.previousState ?? '—'} -> ${log.newState ?? '—'}`
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-[#5D5D66]">
                      <div className="text-[#0D0D0F]">{log.summary}</div>
                      {log.reason && <div className="text-sm mt-0.5">Reason: {log.reason}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.pagination?.auditLogs.hasMore && data.onLoadMore && (
          <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between text-sm">
            <span className="text-[#5D5D66] font-mono">
              Showing {auditLogs.length} audit events
            </span>
            <button
              type="button"
              disabled={data.pagination.auditLogs.loadingMore}
              onClick={() => data.onLoadMore?.('auditLogs')}
              className="px-4 py-2 font-medium border border-black/15 rounded-lg hover:border-black/35 disabled:opacity-50"
            >
              {data.pagination.auditLogs.loadingMore ? 'Loading...' : 'Load Older Audit Logs'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (section === 'settings') {
    const advisory = metrics?.firebaseTierAdvisory;
    const webhookUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/webhooks/momo`
        : '/api/webhooks/momo';

    return (
      <div className="space-y-8">
        {/* LIVE PERFORMANCE & BLAZE UPGRADE DECISION MONITOR (SUPERADMIN ONLY) */}
        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[15px] font-mono text-[#0D7A5F] uppercase">
                Capacity & Infrastructure Telemetry
              </p>
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                Live Performance Monitor & Firebase Upgrade Advisory
              </h2>
              <p className="text-sm text-[#5D5D66] mt-0.5">
                Real-time concurrency, response latency, rate-limit activity, and Blaze plan guidance so you decide when to upgrade.
              </p>
            </div>
            <button
              type="button"
              disabled={metricsLoading}
              onClick={() => loadSuperadminServerPanels()}
              className="px-3.5 py-2 text-sm font-medium border border-black/15 rounded-lg hover:border-black/35"
            >
              {metricsLoading ? 'Refreshing...' : 'Refresh Live Metrics'}
            </button>
          </div>

          {metricsError && <p className="text-sm text-[#DC2626]">{metricsError}</p>}

          {metrics && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[15px] text-[#5D5D66]">Active / Peak Concurrent</p>
                  <p className="text-xl font-display font-semibold tabular-nums text-[#0D0D0F] mt-1">
                    {metrics.concurrency.inFlight} / {metrics.concurrency.peakConcurrent}
                  </p>
                  <p className="text-[15px] font-mono text-[#0D7A5F] mt-0.5">
                    Uptime {Math.floor(metrics.uptimeSeconds / 60)}m {metrics.uptimeSeconds % 60}s
                  </p>
                </div>
                <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[15px] text-[#5D5D66]">Latency (p50 / p95)</p>
                  <p className="text-xl font-display font-semibold tabular-nums text-[#0D0D0F] mt-1">
                    {metrics.latencyMs.p50}ms / {metrics.latencyMs.p95}ms
                  </p>
                  <p className="text-[15px] font-mono text-[#5D5D66] mt-0.5">
                    Avg {metrics.latencyMs.avg}ms ({metrics.latencyMs.samples} samples)
                  </p>
                </div>
                <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[15px] text-[#5D5D66]">Requests & Rate Limits</p>
                  <p className="text-xl font-display font-semibold tabular-nums text-[#0D0D0F] mt-1">
                    {metrics.traffic.totalRequests.toLocaleString()}
                  </p>
                  <p className="text-[15px] font-mono text-[#5D5D66] mt-0.5">
                    5xx: {metrics.traffic.totalErrors5xx} · 429 blocked: {metrics.traffic.rateLimited429}
                  </p>
                </div>
                <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-4">
                  <p className="text-[15px] text-[#5D5D66]">Server Memory & Ledger</p>
                  <p className="text-xl font-display font-semibold tabular-nums text-[#0D0D0F] mt-1">
                    {metrics.memoryMb.heapUsed} / {metrics.memoryMb.rss} MB
                  </p>
                  <p className="text-[15px] font-mono text-[#5D5D66] mt-0.5">
                    Ledger: {metrics.ledger.paymentCount} tx ({metrics.ledger.pendingCount} pending)
                  </p>
                </div>
              </div>

              {advisory && (
                <div
                  className={`rounded-xl p-4 border text-sm space-y-1 ${
                    advisory.status === 'upgrade_recommended'
                      ? 'bg-[#FEF2F2] border-[#DC2626]/25 text-[#0D0D0F]'
                      : advisory.status === 'watch'
                        ? 'bg-[#FFFBEB] border-[#D97706]/30 text-[#0D0D0F]'
                        : 'bg-[#F2FBF8] border-[#0D7A5F]/25 text-[#0D0D0F]'
                  }`}
                >
                  <p className="font-mono font-semibold uppercase">
                    Capacity Status: {advisory.status.replace('_', ' ')} · Target: {metrics.concurrency.targetCapacityLabel}
                  </p>
                  <p>{advisory.recommendation}</p>
                  <p className="text-[#5D5D66]">{advisory.upgradeDecisionNote}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                Platform Configuration
              </h2>
              <p className="text-sm text-[#5D5D66] mt-1">
                Controls registration policies, default language, and maintenance mode.
              </p>
            </div>

            <form onSubmit={handleSavePlatformSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                  Platform Display Name
                </label>
                <input
                  type="text"
                  required
                  disabled={!access.isSuperadmin}
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                  Default Public Language
                </label>
                <select
                  disabled={!access.isSuperadmin}
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value as 'en' | 'rw')}
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg bg-white"
                >
                  <option value="en">English (en)</option>
                  <option value="rw">Kinyarwanda (rw)</option>
                </select>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 text-sm text-[#0D0D0F]">
                  <input
                    type="checkbox"
                    disabled={!access.isSuperadmin}
                    checked={allowSelfReg}
                    onChange={(e) => setAllowSelfReg(e.target.checked)}
                  />
                  <span>Allow new learner self-registration</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm text-[#0D0D0F]">
                  <input
                    type="checkbox"
                    disabled={!access.isSuperadmin}
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                  />
                  <span>Enable public maintenance banner</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm text-[#0D0D0F]">
                  <input
                    type="checkbox"
                    disabled={!access.isSuperadmin}
                    checked={enablePublicVerify}
                    onChange={(e) => setEnablePublicVerify(e.target.checked)}
                  />
                  <span>Enable public certificate verification portal</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm text-[#0D0D0F]">
                  <input
                    type="checkbox"
                    disabled={!access.isSuperadmin}
                    checked={enableWaitlists}
                    onChange={(e) => setEnableWaitlists(e.target.checked)}
                  />
                  <span>Allow cohort waitlist signups for upcoming courses</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm text-[#0D0D0F]">
                  <input
                    type="checkbox"
                    disabled={!access.isSuperadmin}
                    checked={enableSupportTickets}
                    onChange={(e) => setEnableSupportTickets(e.target.checked)}
                  />
                  <span>Enable Learner Support ticket system</span>
                </label>

                <label className="flex items-center gap-2.5 text-sm text-[#0D0D0F]">
                  <input
                    type="checkbox"
                    disabled={!access.isSuperadmin}
                    checked={enableCoupons}
                    onChange={(e) => setEnableCoupons(e.target.checked)}
                  />
                  <span>Allow promotional coupon codes at checkout</span>
                </label>
              </div>

              <div className="pt-4 border-t border-black/[0.08] space-y-3">
                <h3 className="text-[18px] sm:text-[20px] font-bold tracking-[-0.015em] leading-[1.3] font-display text-[#0D0D0F]">
                  Certificate Branding & Eligibility Rules
                </h3>
                <div>
                  <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                    Issuing Organization Name
                  </label>
                  <input
                    type="text"
                    disabled={!access.isSuperadmin}
                    value={certOrgName}
                    onChange={(e) => setCertOrgName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-black/15 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                      Signatory Name
                    </label>
                    <input
                      type="text"
                      disabled={!access.isSuperadmin}
                      value={certSigName}
                      onChange={(e) => setCertSigName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-black/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                      Signatory Title
                    </label>
                    <input
                      type="text"
                      disabled={!access.isSuperadmin}
                      value={certSigTitle}
                      onChange={(e) => setCertSigTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-black/15 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                      Min Quiz Average (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!access.isSuperadmin}
                      value={certMinQuiz}
                      onChange={(e) => setCertMinQuiz(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm font-mono border border-black/15 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                      Min Approved Project (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={!access.isSuperadmin}
                      value={certMinProj}
                      onChange={(e) => setCertMinProj(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm font-mono border border-black/15 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0D0D0F] mb-1">
                  Change Reason
                </label>
                <input
                  type="text"
                  disabled={!access.isSuperadmin}
                  value={settingsReason}
                  onChange={(e) => setSettingsReason(e.target.value)}
                  placeholder="e.g. Opened cohort registration"
                  className="w-full px-3.5 py-2 text-[15px] border border-black/15 rounded-lg"
                />
              </div>

              {settingsMsg && <p className="text-sm text-[#0D7A5F] font-medium">{settingsMsg}</p>}

              {access.isSuperadmin && (
                <button
                  type="submit"
                  disabled={settingsBusy}
                  className="px-5 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg"
                >
                  {settingsBusy ? 'Saving...' : 'Save Platform Settings'}
                </button>
              )}
            </form>
          </div>

          {/* SUPERADMIN ENCRYPTED GATEWAY CREDENTIALS VAULT */}
          <div className="lg:col-span-7 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-[15px] font-mono text-[#0D7A5F] uppercase">
                AES-256-GCM Server-Side Vault
              </p>
              <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
                MTN MoMo & Payment / Messaging Gateway Keys
              </h2>
              <p className="text-sm text-[#5D5D66] mt-1">
                Configure MTN Mobile Money Rwanda, Airtel Money, Email, and SMS credentials once obtained. Keys are encrypted on the server and never exposed to client browsers or Firestore.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 p-1 bg-[#F4F5F7] rounded-xl">
              {(
                [
                  { id: 'momo', label: 'MTN MoMo', active: momoEnabled },
                  { id: 'airtel', label: 'Airtel Money', active: airtelEnabled },
                  { id: 'email', label: 'Email (SMTP/Resend)', active: emailEnabled },
                  { id: 'sms', label: 'SMS Gateway', active: smsEnabled }
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveGatewayTab(item.id);
                    setGatewayTestMsg(null);
                    setGatewaySaveMsg(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeGatewayTab === item.id
                      ? 'bg-white text-[#0D0D0F] shadow-xs'
                      : 'text-[#5D5D66] hover:text-[#0D0D0F]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.active ? 'bg-[#0D7A5F]' : 'bg-black/20'
                    }`}
                  />
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveGatewayConfig} className="space-y-4">
              {activeGatewayTab === 'momo' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-3.5 text-sm">
                    <div>
                      <p className="font-semibold text-[#0D0D0F]">MTN MoMo Collection API Status</p>
                      <p className="text-[#5D5D66] font-mono text-[15px]">
                        Source: {gatewayMasked?.momo.source || 'none'} · Configured:{' '}
                        {gatewayMasked?.momo.configured ? 'Yes' : 'Pending keys'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 font-medium text-[#0D0D0F]">
                      <input
                        type="checkbox"
                        checked={momoEnabled}
                        onChange={(e) => setMomoEnabled(e.target.checked)}
                      />
                      <span>Enable Live Dispatch</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Environment</label>
                      <select
                        value={momoEnv}
                        onChange={(e) => setMomoEnv(e.target.value as 'sandbox' | 'production')}
                        className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (mtnrwanda)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Target Currency</label>
                      <select
                        value={momoCurrency}
                        onChange={(e) => setMomoCurrency(e.target.value as 'RWF' | 'EUR')}
                        className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
                      >
                        <option value="RWF">RWF (Production)</option>
                        <option value="EUR">EUR (Sandbox)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Merchant MSISDN</label>
                      <input
                        type="text"
                        value={momoMerchantMsisdn}
                        onChange={(e) => setMomoMerchantMsisdn(e.target.value)}
                        placeholder="250788..."
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        MTN API User (UUID){' '}
                        {gatewayMasked?.momo.apiUserMasked && (
                          <span className="font-mono text-[#0D7A5F]">
                            [{gatewayMasked.momo.apiUserMasked}]
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={momoApiUser}
                        onChange={(e) => setMomoApiUser(e.target.value)}
                        placeholder={
                          gatewayMasked?.momo.apiUserMasked
                            ? 'Leave blank to keep saved value'
                            : 'Enter X-Reference-Id UUID'
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        MTN API Key{' '}
                        {gatewayMasked?.momo.apiKeyMasked && (
                          <span className="font-mono text-[#0D7A5F]">
                            [{gatewayMasked.momo.apiKeyMasked}]
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={momoApiKey}
                        onChange={(e) => setMomoApiKey(e.target.value)}
                        placeholder={
                          gatewayMasked?.momo.apiKeyMasked
                            ? 'Leave blank to keep saved key'
                            : 'Enter MTN API Key'
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Ocp-Apim-Subscription-Key{' '}
                        {gatewayMasked?.momo.subscriptionKeyMasked && (
                          <span className="font-mono text-[#0D7A5F]">
                            [{gatewayMasked.momo.subscriptionKeyMasked}]
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={momoSubKey}
                        onChange={(e) => setMomoSubKey(e.target.value)}
                        placeholder={
                          gatewayMasked?.momo.subscriptionKeyMasked
                            ? 'Leave blank to keep saved key'
                            : 'Primary Collection Subscription Key'
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Webhook Callback Secret{' '}
                        {gatewayMasked?.momo.callbackSecretMasked && (
                          <span className="font-mono text-[#0D7A5F]">
                            [{gatewayMasked.momo.callbackSecretMasked}]
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={momoCallbackSecret}
                        onChange={(e) => setMomoCallbackSecret(e.target.value)}
                        placeholder="Optional webhook verification secret"
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-3 text-[15px] text-[#5D5D66]">
                    <strong className="text-[#0D0D0F]">Callback URL for MTN Developer Portal: </strong>
                    <span className="font-mono select-all text-[#0D0D0F]">{webhookUrl}</span>
                  </div>
                </div>
              )}

              {activeGatewayTab === 'airtel' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-3.5 text-sm">
                    <div>
                      <p className="font-semibold text-[#0D0D0F]">Airtel Money Rwanda API</p>
                      <p className="text-[#5D5D66] font-mono text-[15px]">
                        Configured: {gatewayMasked?.airtel.configured ? 'Yes' : 'Pending keys'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 font-medium text-[#0D0D0F]">
                      <input
                        type="checkbox"
                        checked={airtelEnabled}
                        onChange={(e) => setAirtelEnabled(e.target.checked)}
                      />
                      <span>Enable Airtel Gateway</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Environment</label>
                    <select
                      value={airtelEnv}
                      onChange={(e) => setAirtelEnv(e.target.value as 'sandbox' | 'production')}
                      className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Client ID{' '}
                        {gatewayMasked?.airtel.clientIdMasked && (
                          <span className="font-mono text-[#0D7A5F]">
                            [{gatewayMasked.airtel.clientIdMasked}]
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={airtelClientId}
                        onChange={(e) => setAirtelClientId(e.target.value)}
                        placeholder="Airtel Client ID"
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Client Secret{' '}
                        {gatewayMasked?.airtel.clientSecretMasked && (
                          <span className="font-mono text-[#0D7A5F]">
                            [{gatewayMasked.airtel.clientSecretMasked}]
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={airtelClientSecret}
                        onChange={(e) => setAirtelClientSecret(e.target.value)}
                        placeholder="Airtel Client Secret"
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Callback Secret{' '}
                      {gatewayMasked?.airtel.callbackSecretMasked && (
                        <span className="font-mono text-[#0D7A5F]">
                          [{gatewayMasked.airtel.callbackSecretMasked}]
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={airtelCallbackSecret}
                      onChange={(e) => setAirtelCallbackSecret(e.target.value)}
                      placeholder="Optional callback signature secret"
                      className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {activeGatewayTab === 'email' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-3.5 text-sm">
                    <div>
                      <p className="font-semibold text-[#0D0D0F]">Transactional Email Provider</p>
                      <p className="text-[#5D5D66] font-mono text-[15px]">
                        Configured: {gatewayMasked?.email.configured ? 'Yes' : 'Pending keys'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 font-medium text-[#0D0D0F]">
                      <input
                        type="checkbox"
                        checked={emailEnabled}
                        onChange={(e) => setEmailEnabled(e.target.checked)}
                      />
                      <span>Enable Outbound Email</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Provider</label>
                      <select
                        value={emailProvider}
                        onChange={(e) => setEmailProvider(e.target.value as 'resend' | 'smtp')}
                        className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
                      >
                        <option value="resend">Resend API</option>
                        <option value="smtp">Custom SMTP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">From Email</label>
                      <input
                        type="email"
                        value={emailFrom}
                        onChange={(e) => setEmailFrom(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                  </div>

                  {emailProvider === 'resend' ? (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Resend API Key{' '}
                        {gatewayMasked?.email.apiKeyMasked && (
                          <span className="font-mono text-[#0D7A5F]">
                            [{gatewayMasked.email.apiKeyMasked}]
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        autoComplete="off"
                        value={emailApiKey}
                        onChange={(e) => setEmailApiKey(e.target.value)}
                        placeholder="re_..."
                        className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="SMTP Host (e.g. smtp.mailgun.org)"
                        className="px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        placeholder="587"
                        className="px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                      <input
                        type="text"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="SMTP Username"
                        className="px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                      <input
                        type="password"
                        autoComplete="off"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="SMTP Password"
                        className="px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeGatewayTab === 'sms' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#F9F9FB] border border-black/[0.06] rounded-xl p-3.5 text-sm">
                    <div>
                      <p className="font-semibold text-[#0D0D0F]">SMS Notification Gateway</p>
                      <p className="text-[#5D5D66] font-mono text-[15px]">
                        Configured: {gatewayMasked?.sms.configured ? 'Yes' : 'Pending keys'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 font-medium text-[#0D0D0F]">
                      <input
                        type="checkbox"
                        checked={smsEnabled}
                        onChange={(e) => setSmsEnabled(e.target.checked)}
                      />
                      <span>Enable SMS</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={smsProvider}
                      onChange={(e) =>
                        setSmsProvider(e.target.value as 'africastalking' | 'twilio' | 'custom')
                      }
                      className="px-3 py-2 text-sm border border-black/15 rounded-lg bg-white"
                    >
                      <option value="africastalking">Africa's Talking</option>
                      <option value="twilio">Twilio</option>
                      <option value="custom">Custom HTTP</option>
                    </select>
                    <input
                      type="text"
                      value={smsSenderId}
                      onChange={(e) => setSmsSenderId(e.target.value)}
                      placeholder="Sender ID (AIEDU_RW)"
                      className="px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                    />
                    <input
                      type="text"
                      value={smsUsername}
                      onChange={(e) => setSmsUsername(e.target.value)}
                      placeholder="API Username"
                      className="px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                    />
                  </div>
                  <input
                    type="password"
                    autoComplete="off"
                    value={smsApiKey}
                    onChange={(e) => setSmsApiKey(e.target.value)}
                    placeholder={
                      gatewayMasked?.sms.apiKeyMasked
                        ? `Saved [${gatewayMasked.sms.apiKeyMasked}] — enter new key to update`
                        : 'Enter SMS API Key'
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-black/15 rounded-lg"
                  />
                </div>
              )}

              {gatewaySaveMsg && (
                <p className="text-sm font-medium text-[#0D7A5F]">{gatewaySaveMsg}</p>
              )}
              {gatewayTestMsg && (
                <p
                  className={`text-sm font-medium ${
                    gatewayTestMsg.ok ? 'text-[#0D7A5F]' : 'text-[#DC2626]'
                  }`}
                >
                  {gatewayTestMsg.text}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={gatewayBusy}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329]"
                >
                  {gatewayBusy ? 'Saving...' : 'Save Encrypted Gateway Keys'}
                </button>
                <button
                  type="button"
                  disabled={gatewayBusy}
                  onClick={() => handleTestGateway(activeGatewayTab)}
                  className="px-4 py-2 text-sm font-medium border border-black/15 rounded-lg hover:border-black/35"
                >
                  Test {activeGatewayTab.toUpperCase()} Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // SECURITY & BACKUP EXPORT
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
        <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
          Operational CSV Reports
        </h2>
        <p className="text-sm text-[#5D5D66] leading-relaxed">
          Download structured operational spreadsheets from live Firestore records for reconciliation and reporting.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `learners-${Date.now()}.csv`,
                ['UID', 'Name', 'Email', 'Role', 'Status', 'Language'],
                users.map((u) => [
                  u.uid,
                  u.displayName,
                  u.email,
                  u.role,
                  u.accountStatus,
                  u.preferredLanguage
                ])
              )
            }
            className="px-4 py-2.5 text-sm font-medium border border-black/15 rounded-lg hover:border-black/35 text-left"
          >
            Download Learners CSV ({users.length})
          </button>

          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `enrollments-${Date.now()}.csv`,
                ['ID', 'User', 'Email', 'Course', 'Status', 'Access Type', 'Amount RWF', 'Completed Days'],
                enrollments.map((e) => [
                  e.id,
                  e.userName,
                  e.userEmail,
                  e.courseId,
                  e.status,
                  e.accessType ?? 'paid',
                  e.amountRwf,
                  e.completedDays.length
                ])
              )
            }
            className="px-4 py-2.5 text-sm font-medium border border-black/15 rounded-lg hover:border-black/35 text-left"
          >
            Download Enrollments CSV ({enrollments.length})
          </button>

          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `payments-${Date.now()}.csv`,
                ['Payment ID', 'Reference', 'Provider', 'Phone Masked', 'Course', 'Amount RWF', 'Status', 'Verified By'],
                payments.map((p) => [
                  p.id,
                  p.transactionRef,
                  p.provider,
                  p.phoneMasked,
                  p.courseId,
                  p.amountRwf,
                  p.status,
                  p.verifiedBy ?? ''
                ])
              )
            }
            className="px-4 py-2.5 text-sm font-medium border border-black/15 rounded-lg hover:border-black/35 text-left"
          >
            Download Payments CSV ({payments.length})
          </button>

          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `audit-logs-${Date.now()}.csv`,
                ['ID', 'Actor', 'Action', 'Collection', 'Target ID', 'Reason', 'Summary'],
                auditLogs.map((l) => [
                  l.id,
                  l.actorEmail,
                  l.action,
                  l.targetCollection,
                  l.targetId,
                  l.reason ?? '',
                  l.summary
                ])
              )
            }
            className="px-4 py-2.5 text-sm font-medium border border-black/15 rounded-lg hover:border-black/35 text-left"
          >
            Download Audit Logs CSV ({auditLogs.length})
          </button>
        </div>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-2xl p-6 space-y-4">
        <h2 className="text-[21px] sm:text-[25px] font-bold tracking-[-0.02em] leading-[1.22] font-display text-[#0D0D0F]">
          Business Data Backup Snapshot
        </h2>
        <p className="text-sm text-[#5D5D66] leading-relaxed">
          Export a complete portable JSON backup of courses, learners, enrollments, payments, refunds, certificates, support requests, and audit history.
        </p>
        <button
          type="button"
          onClick={() =>
            downloadJson(`ai-education-rwanda-backup-${new Date().toISOString().slice(0, 10)}.json`, {
              exportedAt: new Date().toISOString(),
              exportedBy: user.email,
              courses,
              users,
              staffRoles,
              enrollments,
              payments,
              refunds: data.refunds,
              certificates: data.certificates,
              submissions: data.submissions,
              supportTickets: data.supportTickets,
              auditLogs
            })
          }
          className="px-5 py-2.5 text-[15px] font-medium text-white bg-[#0D0D0F] rounded-lg"
        >
          Export Portable JSON Backup
        </button>
      </div>
    </div>
  );
}
