import React from 'react';
import ScanWizard from './ScanWizard';

const AreaScanner = ({ onScanStarted, onClustersDetected, isDark = false }) => {
  return (
    <ScanWizard
      onScanCreated={onScanStarted}
      onClustersGenerated={onClustersDetected}
      isDark={isDark}
    />
  );
};

export default AreaScanner;
