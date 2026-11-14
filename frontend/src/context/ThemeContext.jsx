import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

export const THEME_PRESETS = [
  // ==========================================
  // CORE SAAS & UNIVERSAL THEMES (ORIGINAL 8)
  // ==========================================
  {
    id: 'modern-indigo',
    name: 'Modern Indigo',
    category: 'Universal SaaS',
    mode: 'light',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryText: '#ffffff',
    secondary: '#7c3aed',
    secondaryHover: '#6d28d9',
    secondaryText: '#ffffff',
    accent: '#818cf8',
    accentLight: '#eef2ff',
    accentText: '#3730a3',
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e0e7ff',
    headerBorder: '#e0e7ff',
    navText: '#3730a3',
    navIcon: '#6366f1',
    navHoverBg: '#eef2ff',
    navActiveBg: '#4f46e5',
    navActiveText: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    borderSubtle: '#eef2ff',
    inputBg: '#ffffff',
    inputBorder: '#c7d2fe',
    inputFocus: '#4f46e5',
    tableHeaderBg: '#f8fafc',
    tableRowHover: '#eef2ff',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    scrollbarThumb: '#a5b4fc',
    scrollbarTrack: '#eef2ff',
    dotColor: 'bg-indigo-600',
    ringColor: 'ring-indigo-500',
    previewBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Signature LAX360 fintech indigo aesthetic with vibrant purple highlights and balanced enterprise spacing.'
  },
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    category: 'Universal SaaS',
    mode: 'light',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryText: '#ffffff',
    secondary: '#0ea5e9',
    secondaryHover: '#0284c7',
    secondaryText: '#ffffff',
    accent: '#38bdf8',
    accentLight: '#eff6ff',
    accentText: '#1e40af',
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e2e8f0',
    headerBorder: '#e2e8f0',
    navText: '#475569',
    navIcon: '#64748b',
    navHoverBg: '#f1f5f9',
    navActiveBg: '#2563eb',
    navActiveText: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    inputFocus: '#2563eb',
    tableHeaderBg: '#f8fafc',
    tableRowHover: '#f1f5f9',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    scrollbarThumb: '#93c5fd',
    scrollbarTrack: '#f1f5f9',
    dotColor: 'bg-blue-600',
    ringColor: 'ring-blue-500',
    previewBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Sleek enterprise royal blue with coordinated crisp navigation and modern fintech accents.'
  },
  {
    id: 'professional-purple',
    name: 'Professional Purple',
    category: 'Universal SaaS',
    mode: 'light',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryText: '#ffffff',
    secondary: '#a855f7',
    secondaryHover: '#9333ea',
    secondaryText: '#ffffff',
    accent: '#c084fc',
    accentLight: '#f5f3ff',
    accentText: '#5b21b6',
    bg: '#faf8ff',
    surface: '#ffffff',
    surfaceHover: '#f3e8ff',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#ede9fe',
    headerBorder: '#ede9fe',
    navText: '#4c1d95',
    navIcon: '#7c3aed',
    navHoverBg: '#f5f3ff',
    navActiveBg: '#7c3aed',
    navActiveText: '#ffffff',
    textPrimary: '#1e1b4b',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#ede9fe',
    borderSubtle: '#f5f3ff',
    inputBg: '#ffffff',
    inputBorder: '#ddd6fe',
    inputFocus: '#7c3aed',
    tableHeaderBg: '#faf8ff',
    tableRowHover: '#f5f3ff',
    cardBg: '#ffffff',
    cardBorder: '#ede9fe',
    scrollbarThumb: '#c4b5fd',
    scrollbarTrack: '#f5f3ff',
    dotColor: 'bg-purple-600',
    ringColor: 'ring-purple-500',
    previewBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Luxurious royal violet designed for boutiques, salons, designer studios and premium retail.'
  },
  {
    id: 'ocean-green',
    name: 'Ocean Green',
    category: 'Universal SaaS',
    mode: 'light',
    primary: '#059669',
    primaryHover: '#047857',
    primaryText: '#ffffff',
    secondary: '#0d9488',
    secondaryHover: '#0f766e',
    secondaryText: '#ffffff',
    accent: '#34d399',
    accentLight: '#ecfdf5',
    accentText: '#065f46',
    bg: '#f6fbf8',
    surface: '#ffffff',
    surfaceHover: '#e6f7ef',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#d1fae5',
    headerBorder: '#d1fae5',
    navText: '#064e3b',
    navIcon: '#059669',
    navHoverBg: '#ecfdf5',
    navActiveBg: '#059669',
    navActiveText: '#ffffff',
    textPrimary: '#064e3b',
    textSecondary: '#334155',
    textMuted: '#94a3b8',
    border: '#d1fae5',
    borderSubtle: '#ecfdf5',
    inputBg: '#ffffff',
    inputBorder: '#a7f3d0',
    inputFocus: '#059669',
    tableHeaderBg: '#f0fdf4',
    tableRowHover: '#ecfdf5',
    cardBg: '#ffffff',
    cardBorder: '#d1fae5',
    scrollbarThumb: '#6ee7b7',
    scrollbarTrack: '#ecfdf5',
    dotColor: 'bg-emerald-600',
    ringColor: 'ring-emerald-500',
    previewBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Vibrant emerald green crafted for supermarkets, pharmacies, organic groceries and fresh retail.'
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    category: 'Universal SaaS',
    mode: 'dark',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryText: '#ffffff',
    secondary: '#8b5cf6',
    secondaryHover: '#7c3aed',
    secondaryText: '#ffffff',
    accent: '#818cf8',
    accentLight: '#1e1b4b',
    accentText: '#c7d2fe',
    bg: '#0b0f19',
    surface: '#111827',
    surfaceHover: '#1f2937',
    sidebarBg: '#0f172a',
    headerBg: '#0f172a',
    sidebarBorder: '#1e293b',
    headerBorder: '#1e293b',
    navText: '#cbd5e1',
    navIcon: '#94a3b8',
    navHoverBg: '#1e293b',
    navActiveBg: '#6366f1',
    navActiveText: '#ffffff',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#1e293b',
    borderSubtle: '#111827',
    inputBg: '#1e293b',
    inputBorder: '#334155',
    inputFocus: '#6366f1',
    tableHeaderBg: '#0f172a',
    tableRowHover: '#1e293b',
    cardBg: '#111827',
    cardBorder: '#1e293b',
    scrollbarThumb: '#475569',
    scrollbarTrack: '#0f172a',
    dotColor: 'bg-indigo-500',
    ringColor: 'ring-indigo-400',
    previewBadge: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    description: 'Comfortable eye-friendly dark charcoal theme with matching slate sidebar, header and glowing accents.'
  },
  {
    id: 'light-mode',
    name: 'Light Mode',
    category: 'Universal SaaS',
    mode: 'light',
    primary: '#0284c7',
    primaryHover: '#0369a1',
    primaryText: '#ffffff',
    secondary: '#475569',
    secondaryHover: '#334155',
    secondaryText: '#ffffff',
    accent: '#38bdf8',
    accentLight: '#f0f9ff',
    accentText: '#075985',
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e2e8f0',
    headerBorder: '#e2e8f0',
    navText: '#334155',
    navIcon: '#64748b',
    navHoverBg: '#f1f5f9',
    navActiveBg: '#0284c7',
    navActiveText: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    borderSubtle: '#f8fafc',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    inputFocus: '#0284c7',
    tableHeaderBg: '#f8fafc',
    tableRowHover: '#f1f5f9',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    scrollbarThumb: '#94a3b8',
    scrollbarTrack: '#f1f5f9',
    dotColor: 'bg-sky-600',
    ringColor: 'ring-sky-500',
    previewBadge: 'bg-sky-50 text-sky-800 border-sky-200',
    description: 'High-clarity daylight theme optimized for invoice readability, bright store counters and day-long POS usage.'
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    category: 'Universal SaaS',
    mode: 'dark',
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryText: '#ffffff',
    secondary: '#6366f1',
    secondaryHover: '#4f46e5',
    secondaryText: '#ffffff',
    accent: '#22d3ee',
    accentLight: '#082f49',
    accentText: '#7dd3fc',
    bg: '#030712',
    surface: '#0a1122',
    surfaceHover: '#101c36',
    sidebarBg: '#060b18',
    headerBg: '#060b18',
    sidebarBorder: '#152238',
    headerBorder: '#152238',
    navText: '#94a3b8',
    navIcon: '#38bdf8',
    navHoverBg: '#0f1c33',
    navActiveBg: '#0ea5e9',
    navActiveText: '#ffffff',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#475569',
    border: '#152238',
    borderSubtle: '#0a1122',
    inputBg: '#0a1122',
    inputBorder: '#1e3a5f',
    inputFocus: '#38bdf8',
    tableHeaderBg: '#060b18',
    tableRowHover: '#0f1c33',
    cardBg: '#0a1122',
    cardBorder: '#152238',
    scrollbarThumb: '#1e3a5f',
    scrollbarTrack: '#060b18',
    dotColor: 'bg-cyan-500',
    ringColor: 'ring-cyan-400',
    previewBadge: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    description: 'Ultra-deep space navy blue with glowing neon cyan accents, unified deep navbar & sidebar.'
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    category: 'Universal SaaS',
    mode: 'light',
    primary: '#18181b',
    primaryHover: '#09090b',
    primaryText: '#ffffff',
    secondary: '#71717a',
    secondaryHover: '#52525b',
    secondaryText: '#ffffff',
    accent: '#27272a',
    accentLight: '#f4f4f5',
    accentText: '#18181b',
    bg: '#fafafa',
    surface: '#ffffff',
    surfaceHover: '#f4f4f5',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e4e4e7',
    headerBorder: '#e4e4e7',
    navText: '#27272a',
    navIcon: '#52525b',
    navHoverBg: '#f4f4f5',
    navActiveBg: '#18181b',
    navActiveText: '#ffffff',
    textPrimary: '#09090b',
    textSecondary: '#52525b',
    textMuted: '#a1a1aa',
    border: '#e4e4e7',
    borderSubtle: '#f4f4f5',
    inputBg: '#ffffff',
    inputBorder: '#d4d4d8',
    inputFocus: '#18181b',
    tableHeaderBg: '#fafafa',
    tableRowHover: '#f4f4f5',
    cardBg: '#ffffff',
    cardBorder: '#e4e4e7',
    scrollbarThumb: '#d4d4d8',
    scrollbarTrack: '#f4f4f5',
    dotColor: 'bg-zinc-900',
    ringColor: 'ring-zinc-800',
    previewBadge: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    description: 'Understated Nordic aesthetic featuring monochrome geometry, hairline borders and pure black-and-white typography.'
  },

  // ==========================================
  // 1. PREMIUM & LUXURY THEMES (5 THEMES)
  // ==========================================
  {
    id: 'ivory-champagne',
    name: 'Ivory + Champagne Gold',
    category: 'Premium & Luxury',
    mode: 'light',
    primary: '#b99a65',
    primaryHover: '#a48552',
    primaryText: '#ffffff',
    secondary: '#8f7244',
    secondaryHover: '#785f36',
    secondaryText: '#ffffff',
    accent: '#d4be94',
    accentLight: '#f8f5ef',
    accentText: '#5f4c2a',
    bg: '#f8f5ef',
    surface: '#ffffff',
    surfaceHover: '#f4eee1',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#efe9dc',
    headerBorder: '#efe9dc',
    navText: '#292929',
    navIcon: '#b99a65',
    navHoverBg: '#f8f5ef',
    navActiveBg: '#b99a65',
    navActiveText: '#ffffff',
    textPrimary: '#292929',
    textSecondary: '#595959',
    textMuted: '#8c8c8c',
    border: '#e8e2d3',
    borderSubtle: '#f8f5ef',
    inputBg: '#ffffff',
    inputBorder: '#dfd7c4',
    inputFocus: '#b99a65',
    tableHeaderBg: '#f8f5ef',
    tableRowHover: '#fcfaf6',
    cardBg: '#ffffff',
    cardBorder: '#e8e2d3',
    scrollbarThumb: '#d4be94',
    scrollbarTrack: '#f8f5ef',
    dotColor: 'bg-[#B99A65]',
    ringColor: 'ring-[#B99A65]',
    previewBadge: 'bg-[#F8F5EF] text-[#5F4C2A] border-[#E8E2D3]',
    description: 'Luxury corporate palette featuring refined champagne gold, warm ivory surfaces, and bespoke charcoal typography.'
  },
  {
    id: 'white-deep-teal',
    name: 'White + Deep Teal',
    category: 'Premium & Luxury',
    mode: 'light',
    primary: '#0f5c5b',
    primaryHover: '#0a4544',
    primaryText: '#ffffff',
    secondary: '#183b3a',
    secondaryHover: '#102726',
    secondaryText: '#ffffff',
    accent: '#208a89',
    accentLight: '#f0f7f6',
    accentText: '#0a4544',
    bg: '#f0f7f6',
    surface: '#ffffff',
    surfaceHover: '#e3f0ee',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#d5e7e5',
    headerBorder: '#d5e7e5',
    navText: '#183b3a',
    navIcon: '#0f5c5b',
    navHoverBg: '#f0f7f6',
    navActiveBg: '#0f5c5b',
    navActiveText: '#ffffff',
    textPrimary: '#183b3a',
    textSecondary: '#3f6463',
    textMuted: '#759695',
    border: '#d5e7e5',
    borderSubtle: '#f0f7f6',
    inputBg: '#ffffff',
    inputBorder: '#bedad7',
    inputFocus: '#0f5c5b',
    tableHeaderBg: '#f0f7f6',
    tableRowHover: '#eaf4f3',
    cardBg: '#ffffff',
    cardBorder: '#d5e7e5',
    scrollbarThumb: '#8abfbc',
    scrollbarTrack: '#f0f7f6',
    dotColor: 'bg-[#0F5C5B]',
    ringColor: 'ring-[#0F5C5B]',
    previewBadge: 'bg-[#F0F7F6] text-[#0F5C5B] border-[#D5E7E5]',
    description: 'Deep aristocratic teal paired with crystalline mint-white surfaces for high-tech wealth and fintech prestige.'
  },
  {
    id: 'white-copper',
    name: 'White + Copper',
    category: 'Premium & Luxury',
    mode: 'light',
    primary: '#b76e45',
    primaryHover: '#9e5933',
    primaryText: '#ffffff',
    secondary: '#8a4c2a',
    secondaryHover: '#6e3c20',
    secondaryText: '#ffffff',
    accent: '#d9946f',
    accentLight: '#faf5f0',
    accentText: '#6b371b',
    bg: '#faf5f0',
    surface: '#ffffff',
    surfaceHover: '#f5ebe0',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#ede2d8',
    headerBorder: '#ede2d8',
    navText: '#33302e',
    navIcon: '#b76e45',
    navHoverBg: '#faf5f0',
    navActiveBg: '#b76e45',
    navActiveText: '#ffffff',
    textPrimary: '#33302e',
    textSecondary: '#615d5a',
    textMuted: '#948f8b',
    border: '#eadbce',
    borderSubtle: '#faf5f0',
    inputBg: '#ffffff',
    inputBorder: '#e0cbbb',
    inputFocus: '#b76e45',
    tableHeaderBg: '#faf5f0',
    tableRowHover: '#f5ebe0',
    cardBg: '#ffffff',
    cardBorder: '#eadbce',
    scrollbarThumb: '#d9946f',
    scrollbarTrack: '#faf5f0',
    dotColor: 'bg-[#B76E45]',
    ringColor: 'ring-[#B76E45]',
    previewBadge: 'bg-[#FAF5F0] text-[#B76E45] border-[#EADBCE]',
    description: 'Artisanal metallic copper tones with warm parchment surfaces tailored for creative agencies and boutique architects.'
  },
  {
    id: 'cream-mocha',
    name: 'Cream + Mocha',
    category: 'Premium & Luxury',
    mode: 'light',
    primary: '#75563f',
    primaryHover: '#5f4430',
    primaryText: '#ffffff',
    secondary: '#593e2b',
    secondaryHover: '#422c1d',
    secondaryText: '#ffffff',
    accent: '#a68266',
    accentLight: '#fffdf8',
    accentText: '#453021',
    bg: '#f0e8dd',
    surface: '#fffdf8',
    surfaceHover: '#e8dcce',
    sidebarBg: '#fffdf8',
    headerBg: '#fffdf8',
    sidebarBorder: '#e3d5c5',
    headerBorder: '#e3d5c5',
    navText: '#332820',
    navIcon: '#75563f',
    navHoverBg: '#f0e8dd',
    navActiveBg: '#75563f',
    navActiveText: '#ffffff',
    textPrimary: '#332820',
    textSecondary: '#5c4a3e',
    textMuted: '#8c776a',
    border: '#dfcfbe',
    borderSubtle: '#f0e8dd',
    inputBg: '#fffdf8',
    inputBorder: '#d4c0ac',
    inputFocus: '#75563f',
    tableHeaderBg: '#f0e8dd',
    tableRowHover: '#ede2d3',
    cardBg: '#fffdf8',
    cardBorder: '#dfcfbe',
    scrollbarThumb: '#a68266',
    scrollbarTrack: '#f0e8dd',
    dotColor: 'bg-[#75563F]',
    ringColor: 'ring-[#75563F]',
    previewBadge: 'bg-[#FFFDF8] text-[#75563F] border-[#DFCFBE]',
    description: 'Warm roasted mocha and velvety cream surfaces designed for hospitality, fine dining, and confectioneries.'
  },
  {
    id: 'midnight-burgundy',
    name: 'White + Midnight Burgundy',
    category: 'Premium & Luxury',
    mode: 'light',
    primary: '#681e38',
    primaryHover: '#52142a',
    primaryText: '#ffffff',
    secondary: '#4a1024',
    secondaryHover: '#360918',
    secondaryText: '#ffffff',
    accent: '#9c395b',
    accentLight: '#f8f2f3',
    accentText: '#4a1024',
    bg: '#f8f2f3',
    surface: '#ffffff',
    surfaceHover: '#efe1e4',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#ead8dd',
    headerBorder: '#ead8dd',
    navText: '#29212a',
    navIcon: '#681e38',
    navHoverBg: '#f8f2f3',
    navActiveBg: '#681e38',
    navActiveText: '#ffffff',
    textPrimary: '#29212a',
    textSecondary: '#5c505d',
    textMuted: '#8f8190',
    border: '#e8d5da',
    borderSubtle: '#f8f2f3',
    inputBg: '#ffffff',
    inputBorder: '#dcbec6',
    inputFocus: '#681e38',
    tableHeaderBg: '#f8f2f3',
    tableRowHover: '#f4e9eb',
    cardBg: '#ffffff',
    cardBorder: '#e8d5da',
    scrollbarThumb: '#9c395b',
    scrollbarTrack: '#f8f2f3',
    dotColor: 'bg-[#681E38]',
    ringColor: 'ring-[#681E38]',
    previewBadge: 'bg-[#F8F2F3] text-[#681E38] border-[#E8D5DA]',
    description: 'Regal midnight burgundy paired with soft porcelain rose surfaces for executive legal and private wealth suites.'
  },

  // ==========================================
  // 2. MODERN TECHNOLOGY & AI THEMES (8 THEMES)
  // ==========================================
  {
    id: 'electric-violet',
    name: 'White + Electric Violet',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#6938ef',
    primaryHover: '#5324d6',
    primaryText: '#ffffff',
    secondary: '#875bf7',
    secondaryHover: '#7039ed',
    secondaryText: '#ffffff',
    accent: '#b692f6',
    accentLight: '#f4f0ff',
    accentText: '#471db3',
    bg: '#f9f8fe',
    surface: '#ffffff',
    surfaceHover: '#ede8fd',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#ece6fd',
    headerBorder: '#ece6fd',
    navText: '#181136',
    navIcon: '#6938ef',
    navHoverBg: '#f4f0ff',
    navActiveBg: '#6938ef',
    navActiveText: '#ffffff',
    textPrimary: '#181136',
    textSecondary: '#4c4569',
    textMuted: '#8b84a6',
    border: '#e3dafb',
    borderSubtle: '#f4f0ff',
    inputBg: '#ffffff',
    inputBorder: '#d2c2f8',
    inputFocus: '#6938ef',
    tableHeaderBg: '#f9f8fe',
    tableRowHover: '#f2edfd',
    cardBg: '#ffffff',
    cardBorder: '#e3dafb',
    scrollbarThumb: '#b692f6',
    scrollbarTrack: '#f4f0ff',
    dotColor: 'bg-[#6938EF]',
    ringColor: 'ring-[#6938EF]',
    previewBadge: 'bg-[#F4F0FF] text-[#6938EF] border-[#E3DAFB]',
    description: 'High-voltage electric violet tailored for generative AI products, cutting-edge developer platforms, and modern SaaS.'
  },
  {
    id: 'cobalt-blue',
    name: 'White + Cobalt Blue',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#2457d6',
    primaryHover: '#1a42a8',
    primaryText: '#ffffff',
    secondary: '#4475e8',
    secondaryHover: '#2e61db',
    secondaryText: '#ffffff',
    accent: '#6f97f3',
    accentLight: '#eff4ff',
    accentText: '#143385',
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#e8f0fe',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#dbe5f8',
    headerBorder: '#dbe5f8',
    navText: '#0e1f47',
    navIcon: '#2457d6',
    navHoverBg: '#eff4ff',
    navActiveBg: '#2457d6',
    navActiveText: '#ffffff',
    textPrimary: '#0e1f47',
    textSecondary: '#415175',
    textMuted: '#7d8daf',
    border: '#dce4f5',
    borderSubtle: '#eff4ff',
    inputBg: '#ffffff',
    inputBorder: '#c2d2f2',
    inputFocus: '#2457d6',
    tableHeaderBg: '#f8fafc',
    tableRowHover: '#edf3fe',
    cardBg: '#ffffff',
    cardBorder: '#dce4f5',
    scrollbarThumb: '#6f97f3',
    scrollbarTrack: '#eff4ff',
    dotColor: 'bg-[#2457D6]',
    ringColor: 'ring-[#2457D6]',
    previewBadge: 'bg-[#EFF4FF] text-[#2457D6] border-[#DCE4F5]',
    description: 'Deep saturated cobalt blue providing rock-solid confidence for enterprise infrastructure and software companies.'
  },
  {
    id: 'aqua-teal',
    name: 'White + Aqua Teal',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#00a99d',
    primaryHover: '#008b81',
    primaryText: '#ffffff',
    secondary: '#027a71',
    secondaryHover: '#015f58',
    secondaryText: '#ffffff',
    accent: '#34d1c6',
    accentLight: '#e8faf8',
    accentText: '#00635c',
    bg: '#f4fbfa',
    surface: '#ffffff',
    surfaceHover: '#dcf4f1',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#cff2ee',
    headerBorder: '#cff2ee',
    navText: '#0b2d2a',
    navIcon: '#00a99d',
    navHoverBg: '#e8faf8',
    navActiveBg: '#00a99d',
    navActiveText: '#ffffff',
    textPrimary: '#0b2d2a',
    textSecondary: '#35615d',
    textMuted: '#709995',
    border: '#ceefea',
    borderSubtle: '#e8faf8',
    inputBg: '#ffffff',
    inputBorder: '#b1e5df',
    inputFocus: '#00a99d',
    tableHeaderBg: '#f4fbfa',
    tableRowHover: '#e7f7f5',
    cardBg: '#ffffff',
    cardBorder: '#ceefea',
    scrollbarThumb: '#34d1c6',
    scrollbarTrack: '#e8faf8',
    dotColor: 'bg-[#00A99D]',
    ringColor: 'ring-[#00A99D]',
    previewBadge: 'bg-[#E8FAF8] text-[#00A99D] border-[#CEEFEA]',
    description: 'Luminous aqua teal delivering a clean bio-tech, clean energy, and future technology perspective.'
  },
  {
    id: 'neon-lime',
    name: 'White + Neon Lime',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#9bcb36',
    primaryHover: '#81ab29',
    primaryText: '#1a2b06',
    secondary: '#6b941b',
    secondaryHover: '#537512',
    secondaryText: '#ffffff',
    accent: '#b8e558',
    accentLight: '#f4fbeb',
    accentText: '#45630b',
    bg: '#fafcf6',
    surface: '#ffffff',
    surfaceHover: '#edf7d7',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e2f2c5',
    headerBorder: '#e2f2c5',
    navText: '#1e280e',
    navIcon: '#9bcb36',
    navHoverBg: '#f4fbeb',
    navActiveBg: '#9bcb36',
    navActiveText: '#1a2b06',
    textPrimary: '#1e280e',
    textSecondary: '#495733',
    textMuted: '#809166',
    border: '#dfefc3',
    borderSubtle: '#f4fbeb',
    inputBg: '#ffffff',
    inputBorder: '#cce59d',
    inputFocus: '#9bcb36',
    tableHeaderBg: '#fafcf6',
    tableRowHover: '#f2f9e4',
    cardBg: '#ffffff',
    cardBorder: '#dfefc3',
    scrollbarThumb: '#b8e558',
    scrollbarTrack: '#f4fbeb',
    dotColor: 'bg-[#9BCB36]',
    ringColor: 'ring-[#9BCB36]',
    previewBadge: 'bg-[#F4FBEB] text-[#45630B] border-[#DFEFC3]',
    description: 'Electrifying high-energy neon lime crafted for hyper-growth startups, agile labs, and disruptive consumer apps.'
  },
  {
    id: 'coral-orange',
    name: 'White + Coral Orange',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#f07850',
    primaryHover: '#d45e36',
    primaryText: '#ffffff',
    secondary: '#c44820',
    secondaryHover: '#a33814',
    secondaryText: '#ffffff',
    accent: '#f89b7a',
    accentLight: '#fef2ee',
    accentText: '#9c300f',
    bg: '#fcf7f5',
    surface: '#ffffff',
    surfaceHover: '#fbe4dc',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#fcdcd1',
    headerBorder: '#fcdcd1',
    navText: '#2b1711',
    navIcon: '#f07850',
    navHoverBg: '#fef2ee',
    navActiveBg: '#f07850',
    navActiveText: '#ffffff',
    textPrimary: '#2b1711',
    textSecondary: '#5e4138',
    textMuted: '#9a7970',
    border: '#f8d8cc',
    borderSubtle: '#fef2ee',
    inputBg: '#ffffff',
    inputBorder: '#f4c3b2',
    inputFocus: '#f07850',
    tableHeaderBg: '#fcf7f5',
    tableRowHover: '#faeae3',
    cardBg: '#ffffff',
    cardBorder: '#f8d8cc',
    scrollbarThumb: '#f89b7a',
    scrollbarTrack: '#fef2ee',
    dotColor: 'bg-[#F07850]',
    ringColor: 'ring-[#F07850]',
    previewBadge: 'bg-[#FEF2EE] text-[#F07850] border-[#F8D8CC]',
    description: 'Warm, energetic coral orange combining modern digital agency playfulness with crisp enterprise execution.'
  },
  {
    id: 'electric-cyan',
    name: 'White + Electric Cyan',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#00a6d6',
    primaryHover: '#008ab2',
    primaryText: '#ffffff',
    secondary: '#026e8e',
    secondaryHover: '#01556e',
    secondaryText: '#ffffff',
    accent: '#45c5ee',
    accentLight: '#e8f8fd',
    accentText: '#015670',
    bg: '#f3fafd',
    surface: '#ffffff',
    surfaceHover: '#daf2fb',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#cfeff8',
    headerBorder: '#cfeff8',
    navText: '#0c232b',
    navIcon: '#00a6d6',
    navHoverBg: '#e8f8fd',
    navActiveBg: '#00a6d6',
    navActiveText: '#ffffff',
    textPrimary: '#0c232b',
    textSecondary: '#355663',
    textMuted: '#6c909e',
    border: '#ceebf5',
    borderSubtle: '#e8f8fd',
    inputBg: '#ffffff',
    inputBorder: '#b3e2f2',
    inputFocus: '#00a6d6',
    tableHeaderBg: '#f3fafd',
    tableRowHover: '#e4f5fc',
    cardBg: '#ffffff',
    cardBorder: '#ceebf5',
    scrollbarThumb: '#45c5ee',
    scrollbarTrack: '#e8f8fd',
    dotColor: 'bg-[#00A6D6]',
    ringColor: 'ring-[#00A6D6]',
    previewBadge: 'bg-[#E8F8FD] text-[#00A6D6] border-[#CEEBF5]',
    description: 'Ultra-sharp electric cyan echoing autonomous systems, quantum computing, and advanced neural AI.'
  },
  {
    id: 'indigo-purple',
    name: 'White + Indigo Purple',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#5046a8',
    primaryHover: '#3f368c',
    primaryText: '#ffffff',
    secondary: '#6b60ce',
    secondaryHover: '#564ab9',
    secondaryText: '#ffffff',
    accent: '#9086ea',
    accentLight: '#f2f1fb',
    accentText: '#342b7a',
    bg: '#f8f8fd',
    surface: '#ffffff',
    surfaceHover: '#eae8f9',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e3e1f7',
    headerBorder: '#e3e1f7',
    navText: '#1b1736',
    navIcon: '#5046a8',
    navHoverBg: '#f2f1fb',
    navActiveBg: '#5046a8',
    navActiveText: '#ffffff',
    textPrimary: '#1b1736',
    textSecondary: '#4b466a',
    textMuted: '#847e9f',
    border: '#e1ddf6',
    borderSubtle: '#f2f1fb',
    inputBg: '#ffffff',
    inputBorder: '#cec7f0',
    inputFocus: '#5046a8',
    tableHeaderBg: '#f8f8fd',
    tableRowHover: '#f0eefa',
    cardBg: '#ffffff',
    cardBorder: '#e1ddf6',
    scrollbarThumb: '#9086ea',
    scrollbarTrack: '#f2f1fb',
    dotColor: 'bg-[#5046A8]',
    ringColor: 'ring-[#5046A8]',
    previewBadge: 'bg-[#F2F1FB] text-[#5046A8] border-[#E1DDF6]',
    description: 'Balanced indigo-purple engineering authority tailored for complex multi-tenant B2B enterprise suites.'
  },
  {
    id: 'ocean-blue',
    name: 'White + Ocean Blue',
    category: 'Modern Technology & AI',
    mode: 'light',
    primary: '#247ba0',
    primaryHover: '#1a5e7b',
    primaryText: '#ffffff',
    secondary: '#144a61',
    secondaryHover: '#0e3547',
    secondaryText: '#ffffff',
    accent: '#4ea5ca',
    accentLight: '#eff7fa',
    accentText: '#103e52',
    bg: '#f4f8fa',
    surface: '#ffffff',
    surfaceHover: '#deedf3',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#d5e7ef',
    headerBorder: '#d5e7ef',
    navText: '#10242d',
    navIcon: '#247ba0',
    navHoverBg: '#eff7fa',
    navActiveBg: '#247ba0',
    navActiveText: '#ffffff',
    textPrimary: '#10242d',
    textSecondary: '#3b5865',
    textMuted: '#72909e',
    border: '#d3e5ed',
    borderSubtle: '#eff7fa',
    inputBg: '#ffffff',
    inputBorder: '#bbd8e5',
    inputFocus: '#247ba0',
    tableHeaderBg: '#f4f8fa',
    tableRowHover: '#eaf3f7',
    cardBg: '#ffffff',
    cardBorder: '#d3e5ed',
    scrollbarThumb: '#4ea5ca',
    scrollbarTrack: '#eff7fa',
    dotColor: 'bg-[#247BA0]',
    ringColor: 'ring-[#247BA0]',
    previewBadge: 'bg-[#EFF7FA] text-[#247BA0] border-[#D3E5ED]',
    description: 'Deep maritime ocean blue conveying global connectivity, multi-region reliability, and cloud networking.'
  },

  // ==========================================
  // 3. MINIMAL AESTHETIC THEMES (7 THEMES)
  // ==========================================
  {
    id: 'apple-slate',
    name: 'Snow White + Slate Grey',
    category: 'Minimal Aesthetic',
    mode: 'light',
    primary: '#64748b',
    primaryHover: '#475569',
    primaryText: '#ffffff',
    secondary: '#334155',
    secondaryHover: '#1e293b',
    secondaryText: '#ffffff',
    accent: '#94a3b8',
    accentLight: '#f1f5f9',
    accentText: '#1e293b',
    bg: '#fafafa',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e2e8f0',
    headerBorder: '#e2e8f0',
    navText: '#0f172a',
    navIcon: '#64748b',
    navHoverBg: '#f1f5f9',
    navActiveBg: '#64748b',
    navActiveText: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    inputFocus: '#64748b',
    tableHeaderBg: '#fafafa',
    tableRowHover: '#f4f6f8',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    scrollbarThumb: '#cbd5e1',
    scrollbarTrack: '#f1f5f9',
    dotColor: 'bg-[#64748B]',
    ringColor: 'ring-[#64748B]',
    previewBadge: 'bg-[#F1F5F9] text-[#1E293B] border-[#E2E8F0]',
    description: 'Pristine Apple-inspired minimalism pairing optical white glass with balanced slate grey precision.'
  },
  {
    id: 'dusty-rose',
    name: 'White + Dusty Rose',
    category: 'Minimal Aesthetic',
    mode: 'light',
    primary: '#c27b91',
    primaryHover: '#a86379',
    primaryText: '#ffffff',
    secondary: '#8d4a60',
    secondaryHover: '#73374b',
    secondaryText: '#ffffff',
    accent: '#dba1b2',
    accentLight: '#faf1f4',
    accentText: '#693142',
    bg: '#fdf8f9',
    surface: '#ffffff',
    surfaceHover: '#f7e6eb',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#f4dfe6',
    headerBorder: '#f4dfe6',
    navText: '#331b22',
    navIcon: '#c27b91',
    navHoverBg: '#faf1f4',
    navActiveBg: '#c27b91',
    navActiveText: '#ffffff',
    textPrimary: '#331b22',
    textSecondary: '#61444c',
    textMuted: '#997a83',
    border: '#f1dae2',
    borderSubtle: '#faf1f4',
    inputBg: '#ffffff',
    inputBorder: '#e4c3cd',
    inputFocus: '#c27b91',
    tableHeaderBg: '#fdf8f9',
    tableRowHover: '#f8edf0',
    cardBg: '#ffffff',
    cardBorder: '#f1dae2',
    scrollbarThumb: '#dba1b2',
    scrollbarTrack: '#faf1f4',
    dotColor: 'bg-[#C27B91]',
    ringColor: 'ring-[#C27B91]',
    previewBadge: 'bg-[#FAF1F4] text-[#C27B91] border-[#F1DAE2]',
    description: 'Understated soft dusty rose imparting calm warmth, wellness serenity, and modern lifestyle refinement.'
  },
  {
    id: 'sage-green',
    name: 'White + Sage Green',
    category: 'Minimal Aesthetic',
    mode: 'light',
    primary: '#829b76',
    primaryHover: '#69835d',
    primaryText: '#ffffff',
    secondary: '#506846',
    secondaryHover: '#3d5235',
    secondaryText: '#ffffff',
    accent: '#a5ba9c',
    accentLight: '#f3f7f1',
    accentText: '#384c30',
    bg: '#f7faf5',
    surface: '#ffffff',
    surfaceHover: '#e7f0e3',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#e0ebdb',
    headerBorder: '#e0ebdb',
    navText: '#222d1e',
    navIcon: '#829b76',
    navHoverBg: '#f3f7f1',
    navActiveBg: '#829b76',
    navActiveText: '#ffffff',
    textPrimary: '#222d1e',
    textSecondary: '#4d5c48',
    textMuted: '#849480',
    border: '#dce8d7',
    borderSubtle: '#f3f7f1',
    inputBg: '#ffffff',
    inputBorder: '#c6d9bf',
    inputFocus: '#829b76',
    tableHeaderBg: '#f7faf5',
    tableRowHover: '#eef5eb',
    cardBg: '#ffffff',
    cardBorder: '#dce8d7',
    scrollbarThumb: '#a5ba9c',
    scrollbarTrack: '#f3f7f1',
    dotColor: 'bg-[#829B76]',
    ringColor: 'ring-[#829B76]',
    previewBadge: 'bg-[#F3F7F1] text-[#829B76] border-[#DCE8D7]',
    description: 'Organic sage botanical green conveying sustainability, mindful wellness, and natural premium calm.'
  },
  {
    id: 'sky-blue',
    name: 'White + Sky Blue',
    category: 'Minimal Aesthetic',
    mode: 'light',
    primary: '#72a9e8',
    primaryHover: '#548fcc',
    primaryText: '#ffffff',
    secondary: '#3a75b4',
    secondaryHover: '#2a5b91',
    secondaryText: '#ffffff',
    accent: '#a2c8f3',
    accentLight: '#f0f6fd',
    accentText: '#1e4d82',
    bg: '#f8fafd',
    surface: '#ffffff',
    surfaceHover: '#e3effb',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#dbe8f8',
    headerBorder: '#dbe8f8',
    navText: '#14253b',
    navIcon: '#72a9e8',
    navHoverBg: '#f0f6fd',
    navActiveBg: '#72a9e8',
    navActiveText: '#ffffff',
    textPrimary: '#14253b',
    textSecondary: '#3e5776',
    textMuted: '#7892b1',
    border: '#d8e6f7',
    borderSubtle: '#f0f6fd',
    inputBg: '#ffffff',
    inputBorder: '#bfd7f3',
    inputFocus: '#72a9e8',
    tableHeaderBg: '#f8fafd',
    tableRowHover: '#edf4fc',
    cardBg: '#ffffff',
    cardBorder: '#d8e6f7',
    scrollbarThumb: '#a2c8f3',
    scrollbarTrack: '#f0f6fd',
    dotColor: 'bg-[#72A9E8]',
    ringColor: 'ring-[#72A9E8]',
    previewBadge: 'bg-[#F0F6FD] text-[#72A9E8] border-[#D8E6F7]',
    description: 'Airy, open sky blue radiating clarity, effortless navigation, and clean modern positivity.'
  },
  {
    id: 'terracotta',
    name: 'White + Terracotta',
    category: 'Minimal Aesthetic',
    mode: 'light',
    primary: '#c16e4b',
    primaryHover: '#a55533',
    primaryText: '#ffffff',
    secondary: '#873e20',
    secondaryHover: '#6c2e14',
    secondaryText: '#ffffff',
    accent: '#dc9273',
    accentLight: '#fbf2ed',
    accentText: '#692910',
    bg: '#fcf7f4',
    surface: '#ffffff',
    surfaceHover: '#f7e3d9',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#f4ddd2',
    headerBorder: '#f4ddd2',
    navText: '#331b11',
    navIcon: '#c16e4b',
    navHoverBg: '#fbf2ed',
    navActiveBg: '#c16e4b',
    navActiveText: '#ffffff',
    textPrimary: '#331b11',
    textSecondary: '#614133',
    textMuted: '#9a7464',
    border: '#f1d8cc',
    borderSubtle: '#fbf2ed',
    inputBg: '#ffffff',
    inputBorder: '#e4c0b1',
    inputFocus: '#c16e4b',
    tableHeaderBg: '#fcf7f4',
    tableRowHover: '#f9eae2',
    cardBg: '#ffffff',
    cardBorder: '#f1d8cc',
    scrollbarThumb: '#dc9273',
    scrollbarTrack: '#fbf2ed',
    dotColor: 'bg-[#C16E4B]',
    ringColor: 'ring-[#C16E4B]',
    previewBadge: 'bg-[#FBF2ED] text-[#C16E4B] border-[#F1D8CC]',
    description: 'Sun-baked earthy terracotta combining Mediterranean craft warmth with modern Scandinavian studio design.'
  },
  {
    id: 'distinctive-plum',
    name: 'White + Plum',
    category: 'Minimal Aesthetic',
    mode: 'light',
    primary: '#80518d',
    primaryHover: '#663a72',
    primaryText: '#ffffff',
    secondary: '#4f265a',
    secondaryHover: '#3b1845',
    secondaryText: '#ffffff',
    accent: '#a77bb2',
    accentLight: '#f8f2f9',
    accentText: '#451d50',
    bg: '#faf6fb',
    surface: '#ffffff',
    surfaceHover: '#f2e3f4',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#ecddec',
    headerBorder: '#ecddec',
    navText: '#28152d',
    navIcon: '#80518d',
    navHoverBg: '#f8f2f9',
    navActiveBg: '#80518d',
    navActiveText: '#ffffff',
    textPrimary: '#28152d',
    textSecondary: '#583b5e',
    textMuted: '#8e6f94',
    border: '#e8d8e9',
    borderSubtle: '#f8f2f9',
    inputBg: '#ffffff',
    inputBorder: '#d9bfdb',
    inputFocus: '#80518d',
    tableHeaderBg: '#faf6fb',
    tableRowHover: '#f5ebf6',
    cardBg: '#ffffff',
    cardBorder: '#e8d8e9',
    scrollbarThumb: '#a77bb2',
    scrollbarTrack: '#f8f2f9',
    dotColor: 'bg-[#80518D]',
    ringColor: 'ring-[#80518D]',
    previewBadge: 'bg-[#F8F2F9] text-[#80518D] border-[#E8D8E9]',
    description: 'Intriguing distinctive plum balancing moody richness with refined feminine luxury and editorial polish.'
  },
  {
    id: 'bold-mustard',
    name: 'White + Mustard',
    category: 'Minimal Aesthetic',
    mode: 'light',
    primary: '#d4a72c',
    primaryHover: '#b88e1b',
    primaryText: '#1f1802',
    secondary: '#94710e',
    secondaryHover: '#755705',
    secondaryText: '#ffffff',
    accent: '#e6c25e',
    accentLight: '#fdf9ed',
    accentText: '#6b5105',
    bg: '#fcfaf4',
    surface: '#ffffff',
    surfaceHover: '#f7efd5',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    sidebarBorder: '#f6e9c4',
    headerBorder: '#f6e9c4',
    navText: '#292109',
    navIcon: '#d4a72c',
    navHoverBg: '#fdf9ed',
    navActiveBg: '#d4a72c',
    navActiveText: '#1f1802',
    textPrimary: '#292109',
    textSecondary: '#5a4d27',
    textMuted: '#948457',
    border: '#f4e5be',
    borderSubtle: '#fdf9ed',
    inputBg: '#ffffff',
    inputBorder: '#e8d59d',
    inputFocus: '#d4a72c',
    tableHeaderBg: '#fcfaf4',
    tableRowHover: '#f9f3e0',
    cardBg: '#ffffff',
    cardBorder: '#f4e5be',
    scrollbarThumb: '#e6c25e',
    scrollbarTrack: '#fdf9ed',
    dotColor: 'bg-[#D4A72C]',
    ringColor: 'ring-[#D4A72C]',
    previewBadge: 'bg-[#FDF9ED] text-[#D4A72C] border-[#F4E5BE]',
    description: 'Warm, architectural golden mustard projecting bold European corporate confidence and graphic sharpness.'
  },

  // ==========================================
  // 4. ADDITIONAL DUAL-TONE THEME (1 THEME)
  // ==========================================
  {
    id: 'deep-navy-beige',
    name: 'Deep Navy Blue + Soft Beige',
    category: 'Executive & Dual-Tone',
    mode: 'light',
    primary: '#082052',
    primaryHover: '#051433',
    primaryText: '#ffffff',
    secondary: '#1c3b7a',
    secondaryHover: '#132854',
    secondaryText: '#ffffff',
    accent: '#b99a65',
    accentLight: '#f8f0e5',
    accentText: '#082052',
    bg: '#f8f0e5',
    surface: '#ffffff',
    surfaceHover: '#efe3d3',
    sidebarBg: '#082052',
    headerBg: '#082052',
    sidebarBorder: '#06183d',
    headerBorder: '#06183d',
    navText: '#d9e2f2',
    navIcon: '#9bb6e5',
    navHoverBg: '#132f6e',
    navActiveBg: '#1c3b7a',
    navActiveText: '#ffffff',
    textPrimary: '#082052',
    textSecondary: '#334e80',
    textMuted: '#6981ab',
    border: '#e8dac8',
    borderSubtle: '#f0e5d4',
    inputBg: '#ffffff',
    inputBorder: '#d9c7b0',
    inputFocus: '#082052',
    tableHeaderBg: '#f2e7d8',
    tableRowHover: '#fcf9f4',
    cardBg: '#ffffff',
    cardBorder: '#e8dac8',
    scrollbarThumb: '#1c3b7a',
    scrollbarTrack: '#f8f0e5',
    dotColor: 'bg-[#082052]',
    ringColor: 'ring-[#082052]',
    previewBadge: 'bg-[#F8F0E5] text-[#082052] border-[#E8DAC8]',
    description: 'Striking dual-tone executive styling pairing a deep midnight navy connected navbar & sidebar with warm, gentle soft beige surfaces.'
  }
];

// Backward-compatibility lookup table
export const THEME_ALIASES = {
  // Legacy short IDs
  indigo: 'modern-indigo',
  emerald: 'ocean-green',
  violet: 'professional-purple',
  amber: 'coral-orange',
  rose: 'dusty-rose',
  cyan: 'electric-cyan',
  slate: 'apple-slate',
  // Alternate aliases for 21 new themes
  'ivory-champagne-gold': 'ivory-champagne',
  'champagne-gold': 'ivory-champagne',
  'deep-teal': 'white-deep-teal',
  copper: 'white-copper',
  mocha: 'cream-mocha',
  burgundy: 'midnight-burgundy',
  'midnight-burgundy-executive': 'midnight-burgundy',
  'ai-saas': 'electric-violet',
  'software-company': 'cobalt-blue',
  'future-tech': 'aqua-teal',
  'neon-lime-startup': 'neon-lime',
  'digital-agency': 'coral-orange',
  'advanced-ai': 'electric-cyan',
  'enterprise-saas': 'indigo-purple',
  'global-technology': 'ocean-blue',
  'apple-minimal': 'apple-slate',
  'slate-grey': 'apple-slate',
  'soft-aesthetic': 'dusty-rose',
  'natural-premium': 'sage-green',
  'clean-modern': 'sky-blue',
  'creative-studio': 'terracotta',
  plum: 'distinctive-plum',
  mustard: 'bold-mustard',
  'navy-beige': 'deep-navy-beige',
  'deep-navy': 'deep-navy-beige'
};

export const resolvePreset = (presetId) => {
  if (!presetId) return THEME_PRESETS[0]; // modern-indigo default
  const directMatch = THEME_PRESETS.find((p) => p.id === presetId);
  if (directMatch) return directMatch;
  const aliasId = THEME_ALIASES[presetId];
  if (aliasId) {
    const aliasMatch = THEME_PRESETS.find((p) => p.id === aliasId);
    if (aliasMatch) return aliasMatch;
  }
  return THEME_PRESETS[0]; // fallback
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { user, updateUser } = useAuth();

  // 1. Global Platform Default Theme State
  const [globalTheme, setGlobalTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('lax360_global_theme');
      return saved
        ? JSON.parse(saved)
        : {
            mode: 'light',
            preset: 'modern-indigo',
            density: 'comfortable',
            radius: 'rounded-xl',
            headerSidebarStyle: 'connected-clean'
          };
    } catch {
      return {
        mode: 'light',
        preset: 'modern-indigo',
        density: 'comfortable',
        radius: 'rounded-xl',
        headerSidebarStyle: 'connected-clean'
      };
    }
  });

  // 2. User Personal Theme Preference
  const [userTheme, setUserTheme] = useState(() => {
    try {
      if (user?.id) {
        const userSaved = localStorage.getItem(`lax360_user_theme_${user.id}`);
        if (userSaved) return JSON.parse(userSaved);
      }
      return null;
    } catch {
      return null;
    }
  });

  // Fetch global theme from backend on application mount
  useEffect(() => {
    const fetchGlobalTheme = async () => {
      try {
        const res = await api.get('/auth/theme');
        if (res.data) {
          const rawPreset = res.data.preset || 'modern-indigo';
          const resolvedId = resolvePreset(rawPreset).id;
          const fetched = {
            mode: res.data.mode || 'light',
            preset: resolvedId,
            density: res.data.density || 'comfortable',
            radius: res.data.radius || 'rounded-xl',
            headerSidebarStyle: res.data.theme?.headerSidebarStyle || 'connected-clean',
            customPrimary: res.data.theme?.primary,
            customSecondary: res.data.theme?.secondary
          };
          setGlobalTheme(fetched);
          localStorage.setItem('lax360_global_theme', JSON.stringify(fetched));
        }
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchGlobalTheme();
  }, []);

  // Update user personal theme when auth user changes
  useEffect(() => {
    if (user?.id) {
      if (user.preferences?.theme && !user.preferences.theme.use_global) {
        const rawPreset = user.preferences.theme.preset || 'modern-indigo';
        const resolvedId = resolvePreset(rawPreset).id;
        const normalized = {
          ...user.preferences.theme,
          preset: resolvedId
        };
        setUserTheme(normalized);
        localStorage.setItem(`lax360_user_theme_${user.id}`, JSON.stringify(normalized));
      } else {
        const localSaved = localStorage.getItem(`lax360_user_theme_${user.id}`);
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            parsed.preset = resolvePreset(parsed.preset).id;
            setUserTheme(parsed);
          } catch {
            setUserTheme(null);
          }
        } else {
          setUserTheme(null);
        }
      }
    } else {
      setUserTheme(null);
    }
  }, [user]);

  // Determine active theme (User override takes precedence over global default)
  const isCustomUserTheme = Boolean(userTheme && !userTheme.use_global);
  const activeMode = isCustomUserTheme ? (userTheme.mode || 'light') : (globalTheme.mode || 'light');
  const activePresetId = isCustomUserTheme ? (userTheme.preset || 'modern-indigo') : (globalTheme.preset || 'modern-indigo');
  const activeDensity = isCustomUserTheme ? (userTheme.density || 'comfortable') : (globalTheme.density || 'comfortable');
  const activeRadius = isCustomUserTheme ? (userTheme.radius || 'rounded-xl') : (globalTheme.radius || 'rounded-xl');
  const activeHeaderSidebarStyle = isCustomUserTheme
    ? (userTheme.headerSidebarStyle || 'connected-clean')
    : (globalTheme.headerSidebarStyle || 'connected-clean');

  const customPrimary = isCustomUserTheme ? userTheme.customPrimary : globalTheme.customPrimary;
  const customSecondary = isCustomUserTheme ? userTheme.customSecondary : globalTheme.customSecondary;

  // Look up base preset configuration
  const basePreset = resolvePreset(activePresetId);

  // Derive dynamic coordinated theme object
  const currentTheme = React.useMemo(() => {
    const t = { ...basePreset };

    // Apply custom primary color override if provided
    if (customPrimary && /^#[0-9A-Fa-f]{6}$/.test(customPrimary)) {
      t.primary = customPrimary;
      t.primaryHover = customPrimary;
      t.navActiveBg = customPrimary;
      t.inputFocus = customPrimary;
    }

    // Apply custom secondary color override if provided
    if (customSecondary && /^#[0-9A-Fa-f]{6}$/.test(customSecondary)) {
      t.secondary = customSecondary;
      t.secondaryHover = customSecondary;
    }

    // Apply Header and Sidebar Connected Appearance Style
    if (activeHeaderSidebarStyle === 'connected-brand') {
      // Subtle brand tint on both header & sidebar
      t.sidebarBg = t.accentLight;
      t.headerBg = t.accentLight;
      t.sidebarBorder = t.border;
      t.headerBorder = t.border;
      t.navText = t.accentText;
    } else if (activeHeaderSidebarStyle === 'connected-dark') {
      // Dark command center navbar & sidebar across any theme
      t.sidebarBg = '#0b1120';
      t.headerBg = '#0b1120';
      t.sidebarBorder = '#1e293b';
      t.headerBorder = '#1e293b';
      t.navText = '#cbd5e1';
      t.navIcon = t.accent;
      t.navHoverBg = '#1e293b';
    } else {
      // 'connected-clean': matching surface background from base preset
      // Default: respect the preset's dedicated sidebarBg and headerBg (e.g. Deep Navy in deep-navy-beige)
    }

    return t;
  }, [basePreset, customPrimary, customSecondary, activeHeaderSidebarStyle]);

  // Apply complete theme token dictionary to Document Element (DOM)
  const applyThemeToDOM = useCallback(() => {
    const root = document.documentElement;

    // Evaluate light vs dark mode
    let isDark = activeMode === 'dark';
    if (activeMode === 'system') {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Set Data Attributes
    root.setAttribute('data-theme', currentTheme.id);
    root.setAttribute('data-mode', isDark ? 'dark' : 'light');
    root.setAttribute('data-density', activeDensity);
    root.setAttribute('data-radius', activeRadius);
    root.setAttribute('data-nav-style', activeHeaderSidebarStyle);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Radius lookup
    const radiusMap = {
      'rounded-md': '0.375rem',
      'rounded-lg': '0.5rem',
      'rounded-xl': '0.75rem',
      'rounded-2xl': '1rem',
      'rounded-3xl': '1.5rem',
      'rounded-full': '9999px'
    };
    const radiusVal = radiusMap[activeRadius] || '0.75rem';

    // Set Comprehensive CSS Custom Properties on :root
    root.style.setProperty('--theme-bg', currentTheme.bg);
    root.style.setProperty('--theme-surface', currentTheme.surface);
    root.style.setProperty('--theme-surface-hover', currentTheme.surfaceHover);
    root.style.setProperty('--theme-sidebar-bg', currentTheme.sidebarBg);
    root.style.setProperty('--theme-header-bg', currentTheme.headerBg);
    root.style.setProperty('--theme-sidebar-border', currentTheme.sidebarBorder);
    root.style.setProperty('--theme-header-border', currentTheme.headerBorder);
    root.style.setProperty('--theme-nav-text', currentTheme.navText);
    root.style.setProperty('--theme-nav-icon', currentTheme.navIcon);
    root.style.setProperty('--theme-nav-hover-bg', currentTheme.navHoverBg);
    root.style.setProperty('--theme-nav-active-bg', currentTheme.navActiveBg);
    root.style.setProperty('--theme-nav-active-text', currentTheme.navActiveText);
    root.style.setProperty('--theme-text-primary', currentTheme.textPrimary);
    root.style.setProperty('--theme-text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--theme-text-muted', currentTheme.textMuted);
    root.style.setProperty('--theme-border', currentTheme.border);
    root.style.setProperty('--theme-border-subtle', currentTheme.borderSubtle);
    root.style.setProperty('--theme-primary', currentTheme.primary);
    root.style.setProperty('--theme-primary-hover', currentTheme.primaryHover);
    root.style.setProperty('--theme-primary-text', currentTheme.primaryText);
    root.style.setProperty('--theme-secondary', currentTheme.secondary);
    root.style.setProperty('--theme-secondary-hover', currentTheme.secondaryHover);
    root.style.setProperty('--theme-secondary-text', currentTheme.secondaryText);
    root.style.setProperty('--theme-accent', currentTheme.accent);
    root.style.setProperty('--theme-accent-light', currentTheme.accentLight);
    root.style.setProperty('--theme-accent-text', currentTheme.accentText);
    root.style.setProperty('--theme-input-bg', currentTheme.inputBg);
    root.style.setProperty('--theme-input-border', currentTheme.inputBorder);
    root.style.setProperty('--theme-input-focus', currentTheme.inputFocus);
    root.style.setProperty('--theme-table-header-bg', currentTheme.tableHeaderBg);
    root.style.setProperty('--theme-table-row-hover', currentTheme.tableRowHover);
    root.style.setProperty('--theme-card-bg', currentTheme.cardBg);
    root.style.setProperty('--theme-card-border', currentTheme.cardBorder);
    root.style.setProperty('--theme-scrollbar-thumb', currentTheme.scrollbarThumb);
    root.style.setProperty('--theme-scrollbar-track', currentTheme.scrollbarTrack);
    root.style.setProperty('--theme-radius', radiusVal);

    // Backward-compatibility properties
    root.style.setProperty('--theme-light', currentTheme.accentLight);
    root.style.setProperty('--theme-text', currentTheme.accentText);
  }, [activeMode, activeDensity, activeRadius, activeHeaderSidebarStyle, currentTheme]);

  useEffect(() => {
    applyThemeToDOM();
  }, [applyThemeToDOM]);

  // Save personal user theme preference (isolated per user)
  const saveUserTheme = async (newTheme) => {
    const payload = {
      ...newTheme,
      use_global: false
    };

    setUserTheme(payload);
    if (user?.id) {
      localStorage.setItem(`lax360_user_theme_${user.id}`, JSON.stringify(payload));
      try {
        const res = await api.put('/auth/preferences', { theme: payload });
        if (res.data?.user && updateUser) {
          updateUser(res.data.user);
        }
      } catch (err) {
        console.error('Failed to sync personal appearance preference to backend:', err);
      }
    }
  };

  // Reset user theme to inherit platform global theme
  const resetUserToGlobal = async () => {
    setUserTheme(null);
    if (user?.id) {
      localStorage.removeItem(`lax360_user_theme_${user.id}`);
      try {
        await api.put('/auth/preferences', { theme: { use_global: true } });
      } catch (err) {
        console.error('Failed to reset personal preference:', err);
      }
    }
  };

  // Update global application theme (Admin scope)
  const updateGlobalTheme = async (newGlobalTheme) => {
    const normalized = {
      ...newGlobalTheme,
      preset: resolvePreset(newGlobalTheme.preset).id
    };
    setGlobalTheme(normalized);
    localStorage.setItem('lax360_global_theme', JSON.stringify(normalized));
  };

  return (
    <ThemeContext.Provider
      value={{
        activeTheme: {
          mode: activeMode,
          preset: currentTheme.id,
          density: activeDensity,
          radius: activeRadius,
          headerSidebarStyle: activeHeaderSidebarStyle,
          isCustom: isCustomUserTheme
        },
        globalTheme,
        userTheme,
        currentPreset: currentTheme,
        THEME_PRESETS,
        resolvePreset,
        saveUserTheme,
        resetUserToGlobal,
        updateGlobalTheme,
        isCustomUserTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
