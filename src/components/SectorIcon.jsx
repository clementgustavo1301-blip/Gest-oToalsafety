import React from 'react';
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  HardHat,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

const sectorIcons = {
  SST: HardHat,
  'Clínica': Stethoscope,
  Clinica: Stethoscope,
  Treinamento: GraduationCap,
  Administrativo: BriefcaseBusiness,
  Diretoria: ShieldCheck,
  Admin: ShieldCheck,
  IPA: Activity
};

const getSectorKey = (sector = '') => {
  const normalized = sector.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['sst', 'clinica', 'treinamento', 'administrativo', 'diretoria', 'admin', 'ipa'].includes(normalized)
    ? normalized
    : 'default';
};

const SectorIcon = ({ sector, size = 18, className = '', ...props }) => {
  const Icon = sectorIcons[sector] || Building2;
  return (
    <span className={`sector-icon sector-icon--${getSectorKey(sector)} ${className}`.trim()} {...props}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
};

export default SectorIcon;
