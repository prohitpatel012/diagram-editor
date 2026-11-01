import React from 'react';
import * as LuIcons from 'react-icons/lu';
import * as Fa6Icons from 'react-icons/fa6';

export interface IconCategory {
  id: string;
  name: string;
  icons: string[];
}

export const ICON_CATEGORIES: IconCategory[] = [
  {
    id: 'architecture',
    name: 'Cloud & Architecture',
    icons: [
      'LuServer', 'LuDatabase', 'LuCloud', 'LuHardDrive', 'LuCpu', 'LuNetwork',
      'LuShield', 'LuLock', 'LuKey', 'LuRadio', 'LuWifi', 'LuTerminal',
      'LuBoxes', 'LuContainer', 'LuGlobe', 'LuWebhook', 'LuZap', 'LuActivity',
      'FaAws', 'FaDocker', 'FaGithub', 'FaLinux', 'FaNodeJs', 'FaPython', 'FaReact'
    ]
  },
  {
    id: 'database',
    name: 'Data & Storage',
    icons: [
      'LuDatabase', 'LuTable', 'LuFolder', 'LuFolderGit2', 'LuFile', 'LuFileCode',
      'LuFileJson', 'LuFileSpreadsheet', 'LuHardDrive', 'LuSave', 'LuArchive',
      'LuLayers', 'LuBinary', 'LuGitFork', 'LuGitMerge', 'LuGitPullRequest'
    ]
  },
  {
    id: 'flowchart',
    name: 'Diagram & Workflow',
    icons: [
      'LuGitBranch', 'LuGitCommitHorizontal', 'LuGitPullRequest', 'LuWorkflow',
      'LuShuffle', 'LuRepeat', 'LuCircleCheck', 'LuCircleX', 'LuTriangleAlert',
      'LuCircleHelp', 'LuInfo', 'LuClock', 'LuHourglass', 'LuMilestone', 'LuFlag'
    ]
  },
  {
    id: 'ui',
    name: 'Interface & Controls',
    icons: [
      'LuMousePointer', 'LuPointer', 'LuMove', 'LuSearch', 'LuFilter', 'LuMenu', 'LuSettings',
      'LuSlidersHorizontal', 'LuEye', 'LuEyeOff', 'LuTrash2', 'LuSquarePen', 'LuCopy',
      'LuShare2', 'LuDownload', 'LuUpload', 'LuExternalLink', 'LuMaximize2', 'LuMinimize2'
    ]
  },
  {
    id: 'arrows',
    name: 'Arrows & Direction',
    icons: [
      'LuArrowRight', 'LuArrowLeft', 'LuArrowUp', 'LuArrowDown',
      'LuArrowUpRight', 'LuArrowDownRight', 'LuArrowUpLeft', 'LuArrowDownLeft',
      'LuMoveRight', 'LuCornerDownRight', 'LuCornerUpRight', 'LuRefreshCw'
    ]
  },
  {
    id: 'communication',
    name: 'People & Chat',
    icons: [
      'LuUser', 'LuUsers', 'LuUserCheck', 'LuUserPlus', 'LuMessageSquare',
      'LuMessagesSquare', 'LuMail', 'LuSend', 'LuPhone', 'LuVideo', 'LuBell',
      'LuMegaphone', 'LuThumbsUp', 'LuHeart', 'LuSmile'
    ]
  },
  {
    id: 'business',
    name: 'Business & Analytics',
    icons: [
      'LuChartBar', 'LuChartLine', 'LuChartPie', 'LuTrendingUp', 'LuTrendingDown',
      'LuDollarSign', 'LuCreditCard', 'LuWallet', 'LuBriefcase', 'LuTarget',
      'LuAward', 'LuCheckCheck', 'LuCalendar', 'LuSparkles'
    ]
  },
  {
    id: 'devices',
    name: 'Devices & Media',
    icons: [
      'LuMonitor', 'LuLaptop', 'LuSmartphone', 'LuTablet', 'LuTv',
      'LuCamera', 'LuMic', 'LuSpeaker', 'LuHeadphones', 'LuPrinter', 'LuCode'
    ]
  }
];

// Helper to resolve an icon component by name
export function getIconComponent(iconName: string): React.ComponentType<{ size?: number | string; color?: string; className?: string; style?: React.CSSProperties }> {
  if (iconName in LuIcons) {
    return (LuIcons as Record<string, React.ComponentType<{ size?: number | string; color?: string; className?: string; style?: React.CSSProperties }>>)[iconName];
  }
  if (iconName in Fa6Icons) {
    return (Fa6Icons as Record<string, React.ComponentType<{ size?: number | string; color?: string; className?: string; style?: React.CSSProperties }>>)[iconName];
  }
  return LuIcons.LuCircleHelp;
}

// Search utility
export function searchIcons(query: string): string[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) {
    const set = new Set<string>();
    ICON_CATEGORIES.forEach(cat => cat.icons.forEach(i => set.add(i)));
    return Array.from(set);
  }

  const results: string[] = [];
  const added = new Set<string>();

  // Check categorized icons first
  for (const cat of ICON_CATEGORIES) {
    for (const icon of cat.icons) {
      if (!added.has(icon) && (icon.toLowerCase().includes(cleanQuery) || cat.name.toLowerCase().includes(cleanQuery))) {
        added.add(icon);
        results.push(icon);
      }
    }
  }

  // Also search LuIcons directly
  for (const iconName of Object.keys(LuIcons)) {
    if (results.length >= 120) break;
    if (!added.has(iconName) && iconName.toLowerCase().includes(cleanQuery)) {
      added.add(iconName);
      results.push(iconName);
    }
  }

  return results;
}
