import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExcelUploadProps {
  title: string;
  description: string;
  apiEndpoint: string;
  onSuccess?: () => void;
  acceptedFileTypes?: string;
}

export default function ExcelUpload({
  title,
  description,
  apiEndpoint,
  onSuccess,
  acceptedFileTypes = ".xlsx,.xls,.csv"
}: ExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setUploadStatus('idle');
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file before uploading",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || 'Failed to upload file');
      }

      setUploadStatus('success');
      toast({
        title: "Upload successful",
        description: "Your data has been successfully processed",
      });

      // Reset file input
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to process your file',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="file-upload">Upload File</Label>
          <div className="mt-2">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">{acceptedFileTypes.replace(/\./g, '').toUpperCase()} (Max 10MB)</p>
                </div>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  accept={acceptedFileTypes}
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
          {file && (
            <div className="mt-2 flex items-center text-sm">
              <div className="mr-2 flex-shrink-0">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <div className="text-gray-500 truncate">{file.name}</div>
            </div>
          )}
          {uploadStatus === 'error' && errorMessage && (
            <div className="mt-2 flex items-center text-sm text-red-500">
              <AlertCircle className="mr-2 h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Uploaded
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
