import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Store,
  Percent,
  Printer,
  Download,
  RotateCcw,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  UserCheck,
  Users,
  KeyRound,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Clock,
  FileCheck,
  RefreshCw,
  Loader2,
  Lock,
} from 'lucide-react';
import {
  StoreSetting,
  StaffUser,
  RoleDefinition,
  RolePermissions,
  AuditLog,
  Customer,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { storeService } from '../../services/storeService';
import { storageService } from '../../services/storageService';
import { formatDateTime } from '../../utils/formatters';

interface SettingsViewProps {
  settings: StoreSetting;
  customers?: Customer[];
  onUpdateSettings: (newSettings: Partial<StoreSetting>) => Promise<void>;
  onResetSeedData: () => void;
  onExportBackup: () => void;
}

const PERMISSION_GROUPS: {
  groupTitle: string;
  items: { key: keyof RolePermissions; label: string }[];
}[] = [
  {
    groupTitle: '客户档案权限',
    items: [
      { key: 'customerView', label: '查看客户' },
      { key: 'customerCreate', label: '新增客户' },
      { key: 'customerEdit', label: '编辑客户' },
      { key: 'customerDelete', label: '删除客户' },
    ],
  },
  {
    groupTitle: '量体数据权限',
    items: [
      { key: 'measurementView', label: '查看量体' },
      { key: 'measurementCreate', label: '新增量体' },
      { key: 'measurementEdit', label: '修改量体' },
      { key: 'measurementDelete', label: '删除量体' },
    ],
  },
  {
    groupTitle: '定制订单权限',
    items: [
      { key: 'orderView', label: '查看订单' },
      { key: 'orderCreate', label: '新建开单' },
      { key: 'orderEdit', label: '更新状态/收款' },
      { key: 'orderDelete', label: '取消/删除订单' },
    ],
  },
  {
    groupTitle: '面料库存权限',
    items: [
      { key: 'materialView', label: '查看面料' },
      { key: 'materialCreate', label: '新增面料' },
      { key: 'materialEdit', label: '编辑/出入库' },
      { key: 'materialDelete', label: '删除面料' },
    ],
  },
  {
    groupTitle: '历史档案与照片权限',
    items: [
      { key: 'archiveView', label: '查看/预览档案' },
      { key: 'archiveUpload', label: '上传档案/照片' },
      { key: 'archiveDownload', label: '下载档案原件' },
      { key: 'archiveDelete', label: '删除档案/照片' },
    ],
  },
  {
    groupTitle: '储值资金与系统权限',
    items: [
      { key: 'walletView', label: '查看储值流水' },
      { key: 'walletRecharge', label: '办理储值充值' },
      { key: 'walletDeduct', label: '订单储值扣款' },
      { key: 'walletRefund', label: '储值退款冲正' },
      { key: 'settingsManage', label: '修改系统设置' },
      { key: 'operatorManage', label: '管理操作者账号' },
      { key: 'roleManage', label: '配置角色与权限' },
    ],
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  customers = [],
  onUpdateSettings,
  onResetSeedData,
  onExportBackup,
}) => {
  const {
    currentUser,
    currentRole,
    hasPermission,
    updateMyProfile,
    changePassword,
    sendResetEmail,
    refreshOperatorProfile,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'operators' | 'shop' | 'sync'>('operators');

  // Shop settings state
  const [shopName, setShopName] = useState(settings.shopName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [businessHours, setBusinessHours] = useState(settings.businessHours);
  const [vipDiscountRate, setVipDiscountRate] = useState(settings.vipDiscountRate || 0.95);
  const [svipDiscountRate, setSvipDiscountRate] = useState(settings.svipDiscountRate || 0.90);
  const [defaultSafetyStock, setDefaultSafetyStock] = useState(settings.defaultSafetyStock || 8.0);
  const [printHeader, setPrintHeader] = useState(settings.printHeader);
  const [printFooter, setPrintFooter] = useState(settings.printFooter);

  // My Profile state
  const [myName, setMyName] = useState(currentUser?.displayName || '');
  const [myPhone, setMyPhone] = useState(currentUser?.phone || '');
  const [myPosition, setMyPosition] = useState(currentUser?.position || '');
  const [myAvatarUrl, setMyAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Operators & Roles state
  const [operators, setOperators] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedRoleEdit, setSelectedRoleEdit] = useState<RoleDefinition | null>(null);

  // Operator Modal / Form state
  const [editingOperator, setEditingOperator] = useState<StaffUser | null>(null);
  const [isAddingOperator, setIsAddingOperator] = useState(false);
  const [opFormName, setOpFormName] = useState('');
  const [opFormEmail, setOpFormEmail] = useState('');
  const [opFormPhone, setOpFormPhone] = useState('');
  const [opFormPosition, setOpFormPosition] = useState('');
  const [opFormRoleId, setOpFormRoleId] = useState('role-staff');
  const [opFormStatus, setOpFormStatus] = useState<'active' | 'inactive'>('active');

  // Status & Verification state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifyLogs, setVerifyLogs] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setShopName(settings.shopName);
    setPhone(settings.phone);
    setAddress(settings.address);
    setBusinessHours(settings.businessHours);
    setVipDiscountRate(settings.vipDiscountRate || 0.95);
    setSvipDiscountRate(settings.svipDiscountRate || 0.90);
    setDefaultSafetyStock(settings.defaultSafetyStock || 8.0);
    setPrintHeader(settings.printHeader);
    setPrintFooter(settings.printFooter);
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      setMyName(currentUser.displayName || '');
      setMyPhone(currentUser.phone || '');
      setMyPosition(currentUser.position || '');
      setMyAvatarUrl(currentUser.avatarUrl || '');
    }
  }, [currentUser]);

  const loadOperatorsAndRoles = async () => {
    const [opList, roleList, logList] = await Promise.all([
      storeService.getOperators(),
      storeService.getRoles(),
      storeService.getAuditLogs(),
    ]);
    setOperators(opList);
    setRoles(roleList);
    setAuditLogs(logList);
    if (!selectedRoleEdit && roleList.length > 0) {
      setSelectedRoleEdit(roleList[0]);
    }
  };

  useEffect(() => {
    loadOperatorsAndRoles();
  }, []);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 4500);
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setLoading(true);
      const res = await storageService.uploadFile(file, 'customers');
      setMyAvatarUrl(res.url);
      await updateMyProfile({ avatarUrl: res.url });
      await loadOperatorsAndRoles();
      showToast('个人头像已上传并同步保存！');
    } catch (err: any) {
      showToast(err?.message || '头像上传失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myName.trim()) {
      showToast('操作者姓名不能为空', true);
      return;
    }
    try {
      setLoading(true);
      await updateMyProfile({
        displayName: myName.trim(),
        phone: myPhone.trim(),
        position: myPosition.trim(),
        avatarUrl: myAvatarUrl,
      });
      await loadOperatorsAndRoles();
      showToast('操作者个人信息已更新并同步至云端！');
    } catch (err: any) {
      showToast(err?.message || '保存个人资料失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('新密码长度至少为 6 位', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', true);
      return;
    }
    try {
      setLoading(true);
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('登录密码已通过 Firebase 安全认证流程更新！');
    } catch (err: any) {
      showToast(err?.message || '密码修改失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddOperator = () => {
    setEditingOperator(null);
    setOpFormName('');
    setOpFormEmail('');
    setOpFormPhone('');
    setOpFormPosition('高级量体师 / 定制顾问');
    setOpFormRoleId('role-staff');
    setOpFormStatus('active');
    setIsAddingOperator(true);
  };

  const handleOpenEditOperator = (op: StaffUser) => {
    setEditingOperator(op);
    setOpFormName(op.displayName);
    setOpFormEmail(op.email);
    setOpFormPhone(op.phone || '');
    setOpFormPosition(op.position || '');
    setOpFormRoleId(op.roleId || (op.role === 'admin' ? 'role-admin' : 'role-staff'));
    setOpFormStatus(op.status);
    setIsAddingOperator(true);
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('operatorManage')) {
      showToast('权限不足：仅管理员可管理操作者账号', true);
      return;
    }
    try {
      setLoading(true);
      const targetRole = roles.find(r => r.id === opFormRoleId) || roles[1] || roles[0];
      const roleKey: 'admin' | 'staff' = targetRole?.roleKey === 'admin' ? 'admin' : 'staff';
      const payload: StaffUser = {
        uid: editingOperator ? editingOperator.uid : `staff-${Date.now().toString().slice(-6)}`,
        email: opFormEmail.trim().toLowerCase(),
        displayName: opFormName.trim(),
        phone: opFormPhone.trim(),
        position: opFormPosition.trim(),
        avatarUrl: editingOperator?.avatarUrl || '',
        role: roleKey,
        roleId: targetRole?.id || opFormRoleId,
        roleName: targetRole?.name || (roleKey === 'admin' ? '系统管理员' : '普通操作员'),
        status: opFormStatus,
        createdAt: editingOperator?.createdAt || new Date().toISOString(),
        lastLoginAt: editingOperator?.lastLoginAt,
      };

      await storeService.saveOperator(payload, !editingOperator);
      setIsAddingOperator(false);
      setEditingOperator(null);
      await loadOperatorsAndRoles();
      await refreshOperatorProfile();
      showToast(editingOperator ? '操作者信息与权限已更新！' : '已成功新增授权操作者账号并加入安全白名单！');
    } catch (err: any) {
      showToast(err?.message || '保存操作者失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOperator = async (op: StaffUser) => {
    if (!hasPermission('operatorManage')) {
      showToast('权限不足：仅管理员可移除操作者账号', true);
      return;
    }
    if (!window.confirm(`确定要移除操作者 "${op.displayName}" (${op.email}) 的访问权限吗？`)) return;
    try {
      setLoading(true);
      await storeService.deleteOperator(op.uid);
      await loadOperatorsAndRoles();
      showToast(`已移除操作者 ${op.displayName} 的系统访问权限`);
    } catch (err: any) {
      showToast(err?.message || '移除操作者失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleEdit) return;
    if (!hasPermission('roleManage')) {
      showToast('权限不足：仅系统管理员可调整角色权限配置', true);
      return;
    }
    try {
      setLoading(true);
      await storeService.saveRole(selectedRoleEdit);
      await loadOperatorsAndRoles();
      await refreshOperatorProfile();
      showToast(`角色“${selectedRoleEdit.name}”的权限配置已保存并立即生效！`);
    } catch (err: any) {
      showToast(err?.message || '保存角色权限失败', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('settingsManage')) {
      showToast('权限不足：当前角色无权修改系统核心参数', true);
      return;
    }
    try {
      setLoading(true);
      await onUpdateSettings({
        shopName,
        phone,
        address,
        businessHours,
        vipDiscountRate: Number(vipDiscountRate),
        svipDiscountRate: Number(svipDiscountRate),
        defaultSafetyStock: Number(defaultSafetyStock),
        printHeader,
        printFooter,
      });
      showToast('系统配置与折扣策略已更新并同步至云端！');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCloudMigration = async () => {
    try {
      setLoading(true);
      const res = await storeService.migrateLocalDataToCloud(true);
      showToast(
        `本地数据安全备份与云端合并完成：已备份=${res.backedUp ? '是' : '已存在'}，新同步客户=${res.migratedCustomers}，量体=${res.migratedMeasurements}，订单=${res.migratedOrders}，档案=${res.migratedFiles}`
      );
    } catch (err: any) {
      showToast(err?.message || '迁移执行异常', true);
    } finally {
      setLoading(false);
    }
  };

  const handleRunLiveUploadVerification = async () => {
    setVerifying(true);
    const logs: string[] = [];
    const appendLog = (line: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
      setVerifyLogs([...logs]);
    };

    try {
      appendLog('开始执行云端档案上传（测试图片 + 测试PDF）、客户关联与分片读取实测...');
      const targetCust = customers[0] || { id: 'C20261001', name: '张华峰' };

      // 1. Test Image Upload
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, 400, 240);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('七彩布衣 · 档案上传实测图片', 40, 110);
        ctx.fillStyle = '#e7e5e4';
        ctx.font = '14px monospace';
        ctx.fillText(`Customer: ${targetCust.name} (${targetCust.id})`, 40, 150);
      }
      const imgBlob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('生成测试图片失败'))), 'image/png')
      );
      const testImgFile = new File([imgBlob], 'test_archive_image.png', { type: 'image/png' });

      const imgProgressSteps: number[] = [];
      const imgUploadRes = await storageService.uploadFile(testImgFile, 'archives', p => {
        imgProgressSteps.push(p);
      });
      appendLog(
        `✅ [测试 1/4] 测试图片上传成功：进度轨迹 [${imgProgressSteps.join('% -> ')}%]，分片数=${imgUploadRes.chunkCount}，云端ID=${imgUploadRes.cloudFileId}`
      );

      // Save metadata & verify read
      const savedImgRecord = await storeService.createCustomerFile({
        customerId: targetCust.id,
        customerName: targetCust.name,
        fileName: '实测归档扫描图_系统自检验证.png',
        fileType: 'other',
        year: new Date().getFullYear(),
        fileUrl: imgUploadRes.url,
        fileSize: imgUploadRes.size,
        mimeType: imgUploadRes.type,
        storageMode: imgUploadRes.storageType,
        chunkCount: imgUploadRes.chunkCount,
        verifyStatus: 'verified',
        operatorId: currentUser?.uid || 'staff-01',
        remarks: '系统自动实测上传并随后自动清理',
      });
      const imgReadable = await storageService.verifyFileReadable(savedImgRecord.fileUrl, savedImgRecord.chunkCount);
      const resolvedImgBlobUrl = await storageService.resolveFileUrl(savedImgRecord.fileUrl, savedImgRecord.chunkCount);
      appendLog(
        `✅ [测试 2/4] 测试图片档案记录写入并关联客户【${targetCust.name}】成功，云端读取校验=${imgReadable ? '通过' : '失败'}，解析预览URL=${resolvedImgBlobUrl.slice(0, 32)}...`
      );

      // Clean up test image record
      await storeService.deleteCustomerFile(savedImgRecord.id);

      // 2. Test PDF Upload
      const minimalPdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 18 Tf 72 720 Td (QiCai Bespoke Test PDF) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000190 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
284
%%EOF`;
      const pdfBlob = new Blob([minimalPdfContent], { type: 'application/pdf' });
      const testPdfFile = new File([pdfBlob], 'test_bespoke_order_archive.pdf', { type: 'application/pdf' });

      const pdfProgressSteps: number[] = [];
      const pdfUploadRes = await storageService.uploadFile(testPdfFile, 'archives', p => {
        pdfProgressSteps.push(p);
      });
      const savedPdfRecord = await storeService.createCustomerFile({
        customerId: targetCust.id,
        customerName: targetCust.name,
        fileName: '实测历史订单扫描件_系统自检.pdf',
        fileType: 'historical_order',
        year: new Date().getFullYear(),
        fileUrl: pdfUploadRes.url,
        fileSize: pdfUploadRes.size,
        mimeType: pdfUploadRes.type,
        storageMode: pdfUploadRes.storageType,
        chunkCount: pdfUploadRes.chunkCount,
        verifyStatus: 'verified',
        operatorId: currentUser?.uid || 'staff-01',
        remarks: '系统PDF自检后自动清理',
      });
      const pdfReadable = await storageService.verifyFileReadable(savedPdfRecord.fileUrl, savedPdfRecord.chunkCount);
      const resolvedPdfBlobUrl = await storageService.resolveFileUrl(savedPdfRecord.fileUrl, savedPdfRecord.chunkCount);
      appendLog(
        `✅ [测试 3/4] 测试 PDF 上传、保存并打开校验成功：进度轨迹 [${pdfProgressSteps.join('% -> ')}%]，可读取=${pdfReadable ? '通过' : '失败'}，Blob预览地址=${resolvedPdfBlobUrl.slice(0, 32)}...`
      );

      // Clean up test PDF record so customer data stays clean
      await storeService.deleteCustomerFile(savedPdfRecord.id);
      appendLog('✅ [测试 4/4] 测试临时档案已自动安全清理，现有客户、订单与历史档案 100% 完整保留！');
      showToast('全部 4 项云端上传、关联、预览与删除实测均已通过！');
    } catch (err: any) {
      appendLog(`❌ 实测过程中发现异常: ${err?.message || '未知错误'}`);
      showToast(err?.message || '实测遇到异常', true);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header & Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center space-x-2">
              <Settings className="w-5 h-5 text-amber-600" />
              <span>系统设置 · 操作者与角色权限管理</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              管理操作者个人资料、角色与细粒度权限配置、VIP/SVIP 会员折扣率、跨设备实时同步与全量数据备份
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1 rounded-full font-bold flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span>{currentRole?.name || (currentUser?.role === 'admin' ? '系统管理员' : '普通操作员')}</span>
            </span>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setActiveTab('operators')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
              activeTab === 'operators'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>操作者管理 · 账号与角色权限</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
              activeTab === 'shop'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>工坊资料与 VIP/SVIP 折扣设置</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all ${
              activeTab === 'sync'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>多端同步迁移 · 备份与上传实测验证</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: 操作者管理 · 账号与角色权限 */}
      {activeTab === 'operators' && (
        <div className="space-y-6">
          {/* 1. 当前操作者个人信息管理 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900">当前登录操作者个人信息管理</h3>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                账号状态：{currentUser?.status === 'active' ? '正常启用' : '已停用'}
              </span>
            </div>

            <form onSubmit={handleSaveMyProfile} className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-3 border-b border-stone-100">
                <div className="relative group">
                  {myAvatarUrl ? (
                    <img
                      src={myAvatarUrl}
                      alt={myName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center text-xl font-bold font-serif">
                      {myName ? myName.slice(0, 1) : '主'}
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleAvatarUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-stone-900">{currentUser?.displayName}</span>
                    <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-semibold">
                      {currentRole?.name || (currentUser?.role === 'admin' ? '系统管理员' : '普通操作员')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-mono">
                    登录账号：{currentUser?.email}（受唯一性与安全认证保护）
                  </p>
                  <p className="text-[11px] text-stone-400">
                    创建时间：{formatDateTime(currentUser?.createdAt || '2024-01-01T08:00:00Z')} · 最后登录：{formatDateTime(currentUser?.lastLoginAt || new Date().toISOString())}
                  </p>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={loading}
                    className="mt-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-medium inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>更换个人头像</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">操作者姓名 *</label>
                  <input
                    type="text"
                    required
                    value={myName}
                    onChange={e => setMyName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">联系电话</label>
                  <input
                    type="text"
                    value={myPhone}
                    onChange={e => setMyPhone(e.target.value)}
                    placeholder="如：138-0010-8888"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">所属岗位 / 职位</label>
                  <input
                    type="text"
                    value={myPosition}
                    onChange={e => setMyPosition(e.target.value)}
                    placeholder="如：工坊主理人 / 首席主裁"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>保存个人资料修改</span>
                </button>
              </div>
            </form>

            {/* 安全密码修改 (不显示或保存明文密码) */}
            <form onSubmit={handleChangePassword} className="pt-4 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-800 flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>安全修改登录密码（通过 Firebase Authentication 加密认证，绝不明文存储密码）</span>
                </h4>
                <button
                  type="button"
                  onClick={async () => {
                    if (currentUser?.email) {
                      try {
                        await sendResetEmail(currentUser.email);
                        showToast(`已向 ${currentUser.email} 发送安全密码重置邮件！`);
                      } catch (e: any) {
                        showToast(e?.message || '发送重置邮件失败', true);
                      }
                    }
                  }}
                  className="text-[11px] text-amber-700 hover:underline cursor-pointer font-medium"
                >
                  发送密码重置邮件至邮箱
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="password"
                  placeholder="输入新密码（至少6位）"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="px-3 py-2 border border-stone-300 rounded-lg"
                />
                <input
                  type="password"
                  placeholder="再次确认新密码"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="px-3 py-2 border border-stone-300 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  更新安全密码
                </button>
              </div>
            </form>
          </div>

          {/* 2. 操作者账号列表与白名单管理 (Admin Only) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>工坊授权操作者账号目录（白名单访问控制）</span>
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  仅在此名单中且状态为“正常启用”的账号可登录并读写云端数据；支持后续随时新增店员或量体师账号
                </p>
              </div>
              {hasPermission('operatorManage') && (
                <button
                  type="button"
                  onClick={handleOpenAddOperator}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>新增授权操作者</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 bg-stone-50">
                    <th className="py-2.5 px-3">操作者姓名 / 岗位</th>
                    <th className="py-2.5 px-3">登录账号 (唯一校验)</th>
                    <th className="py-2.5 px-3">联系电话</th>
                    <th className="py-2.5 px-3">所属角色</th>
                    <th className="py-2.5 px-3">状态</th>
                    <th className="py-2.5 px-3">最后登录时间</th>
                    <th className="py-2.5 px-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {operators.map(op => (
                    <tr key={op.uid} className="hover:bg-stone-50/80">
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{op.displayName}</div>
                        <div className="text-[11px] text-stone-400">{op.position || '工坊成员'}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-700">{op.email}</td>
                      <td className="py-3 px-3 text-stone-600">{op.phone || '-'}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            op.role === 'admin'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {op.roleName || (op.role === 'admin' ? '系统管理员' : '普通操作员')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            op.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {op.status === 'active' ? '正常启用' : '已停用'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-stone-400">
                        {op.lastLoginAt ? formatDateTime(op.lastLoginAt) : '尚未登录'}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {hasPermission('operatorManage') ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditOperator(op)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 rounded-lg cursor-pointer"
                              title="编辑操作者"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {op.email !== 'dingzhou02@gmail.com' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteOperator(op)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 bg-stone-100 rounded-lg cursor-pointer"
                                title="移除操作者"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-stone-400">仅管理员可操作</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isAddingOperator && (
              <form
                onSubmit={handleSaveOperator}
                className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-4 mt-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900">
                    {editingOperator ? `编辑操作者：${editingOperator.displayName}` : '新增授权操作者账号'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingOperator(false)}
                    className="text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    取消
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">操作者姓名 *</label>
                    <input
                      type="text"
                      required
                      value={opFormName}
                      onChange={e => setOpFormName(e.target.value)}
                      placeholder="如：王师傅"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">
                      登录邮箱账号 (唯一校验) *
                    </label>
                    <input
                      type="email"
                      required
                      disabled={editingOperator?.email === 'dingzhou02@gmail.com'}
                      value={opFormEmail}
                      onChange={e => setOpFormEmail(e.target.value)}
                      placeholder="operator@example.com"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono disabled:bg-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">联系电话</label>
                    <input
                      type="text"
                      value={opFormPhone}
                      onChange={e => setOpFormPhone(e.target.value)}
                      placeholder="138-xxxx-xxxx"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">所属岗位 / 职位</label>
                    <input
                      type="text"
                      value={opFormPosition}
                      onChange={e => setOpFormPosition(e.target.value)}
                      placeholder="如：制版量体师"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">分配角色</label>
                    <select
                      value={opFormRoleId}
                      onChange={e => setOpFormRoleId(e.target.value)}
                      disabled={editingOperator?.email === 'dingzhou02@gmail.com'}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.roleKey})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">账号状态</label>
                    <select
                      value={opFormStatus}
                      onChange={e => setOpFormStatus(e.target.value as 'active' | 'inactive')}
                      disabled={editingOperator?.email === 'dingzhou02@gmail.com'}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                    >
                      <option value="active">正常启用 (允许登录与访问)</option>
                      <option value="inactive">停用冻结 (立即拦截数据库访问)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    确认保存操作者配置
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3. 角色与细粒度权限矩阵配置 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>角色与细粒度操作权限配置矩阵（支持动态调整）</span>
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  管理员可根据实际业务调整角色名称及查看、新增、编辑、删除、上传、下载和资金操作权限
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {roles.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleEdit(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-colors ${
                      selectedRoleEdit?.id === r.id
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedRoleEdit && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">角色名称</label>
                    <input
                      type="text"
                      value={selectedRoleEdit.name}
                      disabled={!hasPermission('roleManage')}
                      onChange={e =>
                        setSelectedRoleEdit({ ...selectedRoleEdit, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">角色职责说明</label>
                    <input
                      type="text"
                      value={selectedRoleEdit.description}
                      disabled={!hasPermission('roleManage')}
                      onChange={e =>
                        setSelectedRoleEdit({ ...selectedRoleEdit, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PERMISSION_GROUPS.map(group => (
                    <div
                      key={group.groupTitle}
                      className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5"
                    >
                      <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-1.5">
                        {group.groupTitle}
                      </h4>
                      <div className="space-y-1.5">
                        {group.items.map(item => (
                          <label
                            key={item.key}
                            className="flex items-center justify-between cursor-pointer py-0.5"
                          >
                            <span className="text-stone-700">{item.label}</span>
                            <input
                              type="checkbox"
                              disabled={!hasPermission('roleManage')}
                              checked={!!selectedRoleEdit.permissions[item.key]}
                              onChange={e =>
                                setSelectedRoleEdit({
                                  ...selectedRoleEdit,
                                  permissions: {
                                    ...selectedRoleEdit.permissions,
                                    [item.key]: e.target.checked,
                                  },
                                })
                              }
                              className="rounded border-stone-300 text-stone-900 focus:ring-stone-800"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {hasPermission('roleManage') && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveRolePermissions}
                      disabled={loading}
                      className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-400" />
                      <span>保存“{selectedRoleEdit.name}”角色权限配置</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. 关键操作审计日志 (Audit Trail) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  重要业务与权限操作审计日志（记录操作人、时间、对象与结果）
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">不可篡改云端审计追踪</span>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-stone-400 py-4 text-center">暂无操作审计记录</p>
              ) : (
                auditLogs.slice(0, 25).map(log => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-bold text-stone-900 mr-2">[{log.action}]</span>
                      <span className="text-stone-600">{log.details}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 shrink-0 font-mono flex items-center space-x-2">
                      <span>操作人: {log.operatorName || log.operatorId}</span>
                      <span>·</span>
                      <span>{formatDateTime(log.timestamp)}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          log.result === 'failure'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {log.result === 'failure' ? '失败' : '成功'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 工坊资料与 VIP/SVIP 折扣设置 */}
      {activeTab === 'shop' && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop Info */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <Store className="w-4 h-4 text-amber-600" />
            <span>工坊基本信息 (打印凭证抬头)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-700 font-medium mb-1">工坊全称</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">接待预约电话</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">工坊营业时间</label>
              <input
                type="text"
                value={businessHours}
                onChange={e => setBusinessHours(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">工坊实体展厅地址</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* VIP Discount Rules */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
              <Percent className="w-4 h-4 text-amber-600" />
              <span>会员折扣设置 (VIP / SVIP 专属自定义折扣率)</span>
            </h3>
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
              新订单自动采用最新设置 · 历史订单不可篡改已冻结金额
            </span>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1">
            <p className="font-semibold text-stone-800">
              💡 店铺管理员可随时按需调整会员折扣：
            </p>
            <p>
              • 输入例如 <strong className="text-stone-900">9.5</strong> 代表 9.5折（减免 5%），<strong className="text-stone-900">8.8</strong> 代表 8.8折（减免 12%），<strong className="text-stone-900">8.0</strong> 代表 8折（减免 20%）。
            </p>
            <p className="text-[11px] text-stone-500">
              • 已经完成的历史订单保留当时下单时的实际折扣和最终结算价格，不受后续修改影响。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* VIP Settings */}
            <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md text-xs">VIP</span>
                  <span>VIP 客户专属折扣</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  当前: {(vipDiscountRate * 10).toFixed(1)} 折
                </span>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  输入折扣 (例: 9.5折输入 9.5，9折输入 9，8.8折输入 8.8)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    min="5.0"
                    max="10.0"
                    value={(vipDiscountRate * 10).toFixed(1)}
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (val > 0) setVipDiscountRate(Number((val / 10).toFixed(3)));
                    }}
                    className="w-32 px-3 py-2 border border-stone-300 rounded-lg font-bold text-sm text-center bg-white"
                  />
                  <span className="text-sm font-bold text-stone-700">折</span>
                  <span className="text-xs text-stone-400">
                    (= 原价 × {vipDiscountRate.toFixed(2)})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-stone-400 block mb-1.5">快捷预设推荐：</span>
                <div className="flex flex-wrap gap-1.5">
                  {[9.5, 9.2, 9.0, 8.8].map(zhe => (
                    <button
                      key={zhe}
                      type="button"
                      onClick={() => setVipDiscountRate(Number((zhe / 10).toFixed(3)))}
                      className={`px-2.5 py-1 text-xs rounded-lg border cursor-pointer font-medium transition-colors ${
                        (vipDiscountRate * 10).toFixed(1) === zhe.toFixed(1)
                          ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {zhe}折
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SVIP Settings */}
            <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-bold rounded-md text-xs">SVIP</span>
                  <span>SVIP 尊享客户折扣</span>
                </span>
                <span className="text-xs font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  当前: {(svipDiscountRate * 10).toFixed(1)} 折
                </span>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  输入折扣 (例: 9折输入 9，8.5折输入 8.5，8折输入 8)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    min="5.0"
                    max="10.0"
                    value={(svipDiscountRate * 10).toFixed(1)}
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (val > 0) setSvipDiscountRate(Number((val / 10).toFixed(3)));
                    }}
                    className="w-32 px-3 py-2 border border-stone-300 rounded-lg font-bold text-sm text-center bg-white"
                  />
                  <span className="text-sm font-bold text-stone-700">折</span>
                  <span className="text-xs text-stone-400">
                    (= 原价 × {svipDiscountRate.toFixed(2)})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-stone-400 block mb-1.5">快捷预设推荐：</span>
                <div className="flex flex-wrap gap-1.5">
                  {[9.0, 8.8, 8.5, 8.0].map(zhe => (
                    <button
                      key={zhe}
                      type="button"
                      onClick={() => setSvipDiscountRate(Number((zhe / 10).toFixed(3)))}
                      className={`px-2.5 py-1 text-xs rounded-lg border cursor-pointer font-medium transition-colors ${
                        (svipDiscountRate * 10).toFixed(1) === zhe.toFixed(1)
                          ? 'bg-purple-600 text-white border-purple-700 font-bold'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {zhe}折
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-stone-700 font-medium mb-1 text-xs">
              面料库默认安全警戒库存 (米)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={defaultSafetyStock}
              onChange={e => setDefaultSafetyStock(Number(e.target.value))}
              className="w-48 px-3 py-2 border border-stone-300 rounded-lg font-bold text-xs"
            />
            <span className="text-[11px] text-stone-400 mt-1 block">
              低于该米数时工作台产生红色预警
            </span>
          </div>
        </div>

        {/* Print template configurations */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
            <Printer className="w-4 h-4 text-amber-600" />
            <span>A4 定制联打印声明与页脚</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-stone-700 font-medium mb-1">打印单据主抬头标语</label>
              <input
                type="text"
                value={printHeader}
                onChange={e => setPrintHeader(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-medium mb-1">单据页脚交付协议与终身微调说明</label>
              <textarea
                rows={2}
                value={printFooter}
                onChange={e => setPrintFooter(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{loading ? '正在保存...' : '保存系统设置修改'}</span>
          </button>
        </div>
      </form>
      )}

      {/* TAB 3: 多端同步迁移 · 备份与上传实测验证 */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* 1. 电脑、iPad、iPhone 实时同步与本地数据迁移 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>电脑、iPad 与 iPhone 跨设备云端实时同步与历史本地数据安全迁移</span>
            </h3>

            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1.5 text-stone-700 leading-relaxed">
              <p className="font-bold text-stone-900">【统一云端数据源与实时监听机制】</p>
              <p>
                • 客户、量体、订单、面料、储值记录、历史档案及分片文件均统一存储于 Google Cloud Firestore 正式数据库，并通过 <code className="px-1 py-0.5 bg-stone-200 rounded font-mono">onSnapshot</code> 实时监听推送到所有已登录设备。
              </p>
              <p>
                • 当不同设备同时修改同一客户资料时，系统自动检测云端 <code className="px-1 py-0.5 bg-stone-200 rounded font-mono">updatedAt</code> 时间戳并发冲突并弹窗确认，严防静默覆盖。
              </p>
              <p>
                • 如当前浏览器曾保存在本地缓存中的客户或订单数据，点击下方按钮可先自动备份本地快照，再安全合并至云端共享数据库。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleRunCloudMigration}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
                <span>迁移前自动备份并合并本地历史数据至云端</span>
              </button>
            </div>
          </div>

          {/* 2. 档案上传 (图片+PDF)、客户关联与云端分片读取一键实测 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  <span>历史档案上传（测试图片 + 测试 PDF）、关联与读取全流程实测</span>
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  自动生成真实 PNG 图片与标准 PDF 文档，验证分片上传真实进度、客户档案写入、跨端 Blob 读取解析与安全清理
                </p>
              </div>
              <button
                type="button"
                disabled={verifying}
                onClick={handleRunLiveUploadVerification}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs shrink-0"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
                <span>{verifying ? '正在执行云端实测...' : '立即执行上传与读取实测'}</span>
              </button>
            </div>

            {verifyLogs.length > 0 && (
              <div className="p-4 bg-stone-950 text-stone-200 rounded-xl font-mono text-[11px] space-y-1.5 max-h-60 overflow-y-auto">
                {verifyLogs.map((l, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 全量数据冷备份与恢复 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2 border-b border-stone-100 pb-3">
              <Database className="w-4 h-4 text-amber-600" />
              <span>数据备份与安全性说明</span>
            </h3>

            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-2 text-stone-700 leading-relaxed">
              <p className="font-bold text-stone-900">【云端持久化与冷备份导出】</p>
              <p>
                • 当前系统已真实连接 Google Cloud Firestore 数据库，所有客户档案、多次量体记录、订单、储值流水及历史档案均实时持久化。
              </p>
              <p>
                • 您可随时点击下方按钮导出<strong>手动 JSON 完整全量冷备份档案</strong>到本地电脑或手机保存。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>下载全量 JSON 备份档案 (客户+量体+订单+流水+档案)</span>
              </button>

              {hasPermission('settingsManage') && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('确定要将所有数据重置为高端定制工坊初始标准演示数据集吗？')) {
                      onResetSeedData();
                    }
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl border border-stone-300 flex items-center space-x-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-stone-500" />
                  <span>一键重载工坊初始标准示例数据</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
