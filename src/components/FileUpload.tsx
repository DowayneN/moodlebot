
import React, { useState, useRef } from 'react';
import { FileType } from '@/types';
import { readTextFile, parseCSV, validateFile } from '@/utils/fileProcessing';
import { useToast } from '@/components/ui/use-toast';
import { Upload, FileText, Database, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  fileType: FileType;
  onFileProcessed: (data: string | any[]) => void;
  title: string;
  description: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  fileType, 
  onFileProcessed,
  title,
  description
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!validateFile(file, fileType)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a ${fileType} file.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const content = await readTextFile(file);
      
      if (fileType === 'txt') {
        onFileProcessed(content);
      } else if (fileType === 'csv') {
        const parsedData = parseCSV(content);
        onFileProcessed(parsedData);
      }
      
      setIsUploaded(true);
      toast({
        title: "File processed successfully",
        description: `${file.name} has been loaded into the knowledge base.`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error processing file",
        description: "Please try again with a different file.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="card p-5 mb-6 animate-fade-in">
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      
      <div
        className={`upload-zone ${isDragging ? 'border-moodle-orange bg-moodle-orange/5' : ''} ${isUploaded ? 'border-green-500 bg-green-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={fileType === 'txt' ? '.txt' : '.csv'}
          className="hidden"
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center py-4">
            <div className="animate-pulse-light">
              <Upload size={36} className="text-moodle-orange mb-2" />
            </div>
            <p>Processing {fileName}...</p>
          </div>
        ) : isUploaded ? (
          <div className="flex flex-col items-center py-4">
            <CheckCircle size={36} className="text-green-500 mb-2" />
            <p className="font-medium text-green-600">Uploaded {fileName}</p>
            <p className="text-sm text-gray-500 mt-2">Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            {fileType === 'txt' ? (
              <FileText size={36} className="text-moodle-orange mb-2" />
            ) : (
              <Database size={36} className="text-moodle-orange mb-2" />
            )}
            <p className="font-medium">Drop your {fileType.toUpperCase()} file here or click to browse</p>
            <p className="text-sm text-gray-500 mt-2">
              {fileType === 'txt' ? 'Text files only (.txt)' : 'CSV files only (.csv)'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
