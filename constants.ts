// Mock Database for MID matching
export const MOCK_DB_MIDS = [
  "1001",
  "1002",
  "A555",
  "B888",
  "9999",
  "TEST-01",
  "1234567890",
  "295827572958"
];

// Industrial scanner settings
export const SCANNER_CONFIG = {
  // Threshold in milliseconds to distinguish machine input (fast) from human input (slow)
  BURST_THRESHOLD: 50, 
  // Minimum length to consider a burst a valid scan
  MIN_SCAN_LENGTH: 2
};