import React from 'react';
import ScanWizard from './ScanWizard';

const AreaScanner = ({ onScanStarted, isDark = false }) => {
  return <ScanWizard onScanCreated={onScanStarted} isDark={isDark} />;
};

export default AreaScanner;
