export type PageType =
  | 'cover'
  | 'profile'
  | 'about'
  | 'services'
  | 'portfolio'
  | 'project'
  | 'web-app'
  | 'digitalization'
  | 'creative'
  | 'technology'
  | 'case-study'
  | 'contact'
  | 'back-cover'
  | 'custom';

export interface PortfolioPage {
  id: string;
  pageNumber: number;
  title: string;
  subtitle?: string;
  pageType: PageType;
  content?: string;
  imageUrl?: string;
  gallery?: string[];
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  projectId?: string;
  visible: boolean;
  pageOrder: number;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  features: string[];
  technologies: string[];
  coverImage: string;
  gallery: string[];
  videoUrl?: string;
  result?: string;
  externalUrl?: string;
  liveUrl?: string;
  projectOrder: number;
  order?: number;
  visible: boolean;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface PortfolioService {
  id: string;
  title: string;
  description: string;
  iconName: string;
  order: number;
  visible: boolean;
}

export interface CaseStudyItem {
  id: string;
  title: string;
  subtitle?: string;
  client?: string;
  category?: string;
  summary: string;
  challenge: string;
  solution: string;
  result: string;
  coverImage?: string;
  order: number;
  visible: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  subject?: string;
  message: string;
  createdAt: string | number;
  read?: boolean;
  status?: 'new' | 'contacted' | 'resolved';
  notes?: string;
}

export interface PortfolioSettings {
  title: string;
  name: string;
  tagline: string;
  bio: string;
  email: string;
  whatsapp: string;
  linkedin: string;
  instagram: string;
  github: string;
  website: string;
  theme: string;
  soundEnabled: boolean;
  // Cover Customization
  coverLogo?: string;
  coverTagline?: string;
  coverDescription?: string;
  coverEditionText?: string;
  // Profile Customization & Dynamic Counters
  profileImage?: string;
  profileStatusBadge?: string;
  profileHeadline?: string;
  profileDescription?: string;
  profileExperience?: number | string;
  profileExperienceSuffix?: string;
  profileSuccessRate?: number | string;
  profileSuccessRateSuffix?: string;
  profilePrivacyNumber?: number | string;
  profilePrivacyLabel?: string;
  // Executive Folio (Inside Cover) Customization
  folioTagline?: string;
  folioTitle?: string;
  folioDescription?: string;
  folioCuratedLabel?: string;
  folioCuratedValue?: string;
  folioDbLabel?: string;
  folioDbValue?: string;
  folioStorageLabel?: string;
  folioStorageValue?: string;
  folioFooterNote?: string;
  folioCloseText?: string;
  folioYearsLabel?: string;
  folioYearsValue?: string;
  folioAvailabilityLabel?: string;
  folioAvailabilityValue?: string;
  folioSealText?: string;
  // Profile Core Pillars
  profilePillar1Title?: string;
  profilePillar1Desc?: string;
  profilePillar2Title?: string;
  profilePillar2Desc?: string;
  // WhatsApp Direct Integration
  whatsappMessageTemplate?: string;
  // Per-Page Header & Footer Customization
  profileTagline?: string;
  profileFooterLeft?: string;
  profileFooterRight?: string;
  portfolioTagline?: string;
  portfolioFooterLeft?: string;
  portfolioFooterRight?: string;
  servicesTagline?: string;
  servicesFooterLeft?: string;
  servicesFooterRight?: string;
  caseStudyTagline?: string;
  caseStudyFooterLeft?: string;
  caseStudyFooterRight?: string;
  contactTagline?: string;
  contactFooterLeft?: string;
  contactFooterRight?: string;
  // Contact Form Custom Subjects Dropdown
  contactSubjects?: string[];
}

export interface BookEngineState {
  currentPage: number; // 0-based page index
  totalPages: number;
  isAnimating: boolean;
  isDragging: boolean;
  bookOpen: boolean;
  isMobile: boolean;
}
