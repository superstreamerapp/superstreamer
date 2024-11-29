import { Modal, ModalBody, ModalContent } from "@nextui-org/react";
import useSWR from "swr";
import { DataDump } from "./DataDump";
import { useAuth } from "../auth";
import type { StorageFile } from "@superstreamer/api/client";

interface FilePreviewProps {
  path: string | null;
  onClose(): void;
}

export function FilePreview({ path, onClose }: FilePreviewProps) {
  const { api } = useAuth();
  const { data } = useSWR(["file-preview", path], async ([_, path]) => {
    if (!path) {
      return null;
    }

    const result = await api.storage.file.get({ query: { path } });
    if (result.error) {
      throw result.error;
    }
    return result.data;
  });

  return (
    <Modal
      isOpen={path !== null}
      onClose={onClose}
      scrollBehavior="outside"
      size="4xl"
    >
      <ModalContent>
        <ModalBody className="p-6">
          {path ? (
            <div className="text-sm">
              <PathName path={path} />
            </div>
          ) : null}
          {data ? (
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
              <Preview file={data} />
            </div>
          ) : null}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function Preview({ file }: { file: StorageFile }) {
  if (file.mode === "payload") {
    return <DataDump data={file.payload} />;
  }
  if (file.mode === "url") {
    if (file.type === "video") {
      return (
        <video src={file.url} controls className="w-full max-w-lg mx-auto" />
      );
    }
    if (file.type === "audio") {
      return (
        <audio src={file.url} controls className="w-full max-w-lg mx-auto" />
      );
    }
    if (file.type === "image") {
      return <img src={file.url} className="w-full" />;
    }
  }
  return null;
}

function PathName({ path }: { path: string }) {
  const chunks = path.substring(1).split("/");
  return (
    <div className="flex gap-1">
      {chunks.map((chunk, index) => {
        return (
          <>
            <span>{chunk}</span>
            {index < chunks.length - 1 ? (
              <span className="opacity-50">/</span>
            ) : null}
          </>
        );
      })}
    </div>
  );
}
