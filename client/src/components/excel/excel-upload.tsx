import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ExcelUploadProps = {
  onUpload: (file: File) => Promise<void>;
  buttonText?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  acceptedFileTypes?: string;
};

export function ExcelUpload({
  onUpload,
  buttonText = "Upload Excel",
  dialogTitle = "Upload Student Data",
  dialogDescription = "Upload an Excel sheet containing student data. Students will be automatically assigned to mentors.",
  acceptedFileTypes = ".xlsx,.xls",
}: ExcelUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assignmentMethod, setAssignmentMethod] = useState<AssignmentMethod>("equal");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid Excel file (.xlsx, .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClickBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(selectedFile, assignmentMethod);
      setIsOpen(false);
      setSelectedFile(null);
      setAssignmentMethod("equal");
      toast({
        title: "Upload successful",
        description: "The Excel data has been processed successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UploadCloud className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div
            className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={acceptedFileTypes}
              className="hidden"
            />
            
            <UploadCloud className="h-10 w-10 mx-auto text-neutral-400" />
            
            {selectedFile ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-neutral-700">{selectedFile.name}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setSelectedFile(null)}
                >
                  Change File
                </Button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-neutral-600">Drag and drop your Excel file here, or click to browse</p>
                <p className="mt-1 text-xs text-neutral-500">Supports {acceptedFileTypes.split(',').join(', ')} formats</p>
                <Button className="mt-4" variant="outline" onClick={handleClickBrowse}>
                  Browse Files
                </Button>
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Assignment Method</Label>
            <RadioGroup value={assignmentMethod} onValueChange={(value) => setAssignmentMethod(value as AssignmentMethod)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equal" id="equal" />
                <Label htmlFor="equal">Equal Distribution</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="semester" id="semester" />
                <Label htmlFor="semester">Based on Semester</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual Assignment</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Upload & Assign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExcelUpload;
