import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileUp, Loader2 } from "lucide-react";

interface ExcelUploadProps {
  title: string;
  description: string;
  apiEndpoint: string;
  onSuccess?: () => void;
  acceptedFileTypes?: string;
}

interface UploadResponse {
  success: boolean;
  imported: number;
  errors: number;
  errorDetails?: Array<{ row: any; error: string }>;
  results?: Array<{ name: string; status: string }>;
  assignment?: any;
  assignmentError?: string;
}

export default function ExcelUpload({
  title,
  description,
  apiEndpoint,
  onSuccess,
  acceptedFileTypes = ".xlsx,.xls,.csv"
}: ExcelUploadProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setUploadResult(null); // Reset results when file changes
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiRequest("POST", apiEndpoint, null, {
        body: formData,
        customConfig: {
          headers: {
            // Don't set Content-Type here, let the browser set it with the boundary
          },
        },
      });

      const result: UploadResponse = await response.json();
      setUploadResult(result);

      if (result.success) {
        toast({
          title: `Upload successful`,
          description: `${result.imported} records imported successfully`,
        });

        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Upload failed",
          description: "There was an error processing your file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid w-full items-center gap-1.5">
            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Excel or CSV files ({acceptedFileTypes.replace(/\./g, '')})
                  </p>
                </div>
                {file && (
                  <p className="text-sm text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900 py-1 px-3 rounded-full">
                    {file.name}
                  </p>
                )}
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept={acceptedFileTypes}
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
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
          ) : (
            "Upload"
          )}
        </Button>
      </CardFooter>

      {uploadResult && (
        <CardContent className="border-t pt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="text-sm font-medium">Imported</p>
                <p className="text-2xl font-bold">{uploadResult.imported}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <p className="text-sm font-medium">Errors</p>
                <p className="text-2xl font-bold">{uploadResult.errors}</p>
              </div>
            </div>

            {uploadResult.errors > 0 && uploadResult.errorDetails && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Error Details</h4>
                <div className="max-h-40 overflow-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  <ul className="space-y-1 text-xs">
                    {uploadResult.errorDetails.map((error, index) => (
                      <li key={index} className="text-red-500">
                        {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {uploadResult.results && uploadResult.results.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Results</h4>
                <div className="max-h-40 overflow-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  <ul className="space-y-1 text-xs">
                    {uploadResult.results.slice(0, 10).map((result, index) => (
                      <li key={index} className={result.status === "created" ? "text-green-500" : "text-blue-500"}>
                        {result.name}: {result.status}
                      </li>
                    ))}
                    {uploadResult.results.length > 10 && (
                      <li className="text-gray-500">...and {uploadResult.results.length - 10} more</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {uploadResult.assignmentError && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <h4 className="text-sm font-medium mb-1">Assignment Warning</h4>
                <p className="text-xs">{uploadResult.assignmentError}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
