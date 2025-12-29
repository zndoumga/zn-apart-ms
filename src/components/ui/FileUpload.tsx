import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { Upload, X, File } from 'lucide-react';
import { isValidImageType, formatFileSize } from '../../services/storageService';

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  onChange: (files: File[]) => void;
  value?: File[];
  error?: string;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*',
  multiple = false,
  maxSize = 5 * 1024 * 1024, // 5MB default
  onChange,
  value = [],
  error,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      let errorMessage: string | null = null;

      for (const file of fileArray) {
        if (file.size > maxSize) {
          errorMessage = `Le fichier "${file.name}" dépasse la taille maximale de ${formatFileSize(maxSize)}`;
          continue;
        }

        if (accept.includes('image') && !isValidImageType(file)) {
          errorMessage = `Le fichier "${file.name}" n'est pas une image valide`;
          continue;
        }

        validFiles.push(file);
      }

      setLocalError(errorMessage);

      if (multiple) {
        onChange([...value, ...validFiles]);
      } else {
        onChange(validFiles.slice(0, 1));
      }
    },
    [accept, maxSize, multiple, onChange, value]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const displayError = error || localError;

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : displayError
            ? 'border-danger-300 bg-danger-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          <Upload
            className={clsx(
              'w-10 h-10 mx-auto mb-3',
              isDragging ? 'text-primary-500' : 'text-gray-400'
            )}
          />
          <p className="text-sm text-gray-600">
            <span className="font-medium text-primary-600">Cliquez pour télécharger</span> ou
            glissez-déposez
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {accept.includes('image') ? 'PNG, JPG, GIF' : 'Tous les fichiers'} jusqu'à{' '}
            {formatFileSize(maxSize)}
          </p>
        </div>
      </div>

      {displayError && <p className="mt-1 text-sm text-danger-600">{displayError}</p>}

      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          {value.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                  <File className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

