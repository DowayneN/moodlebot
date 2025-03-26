
import { FileType } from '../types';

export const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

export const parseCSV = (csvContent: string): any[] => {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(value => value.trim());
    const entry: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      entry[header] = values[index] || '';
    });
    
    result.push(entry);
  }
  
  return result;
};

export const validateFile = (file: File, type: FileType): boolean => {
  if (type === 'txt' && file.type !== 'text/plain') {
    return false;
  }
  
  if (type === 'csv' && file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    return false;
  }
  
  return true;
};

export const summarizeData = (textContent?: string, csvData?: any[]): string => {
  let summary = 'Knowledge Base Summary:\n';
  
  if (textContent) {
    const textLength = textContent.length;
    const wordCount = textContent.split(/\s+/).length;
    summary += `- Text file: ${textLength} characters, ~${wordCount} words\n`;
  }
  
  if (csvData && csvData.length > 0) {
    const rowCount = csvData.length;
    const columns = Object.keys(csvData[0]).join(', ');
    summary += `- CSV file: ${rowCount} rows\n- Columns: ${columns}`;
  }
  
  return summary;
};
