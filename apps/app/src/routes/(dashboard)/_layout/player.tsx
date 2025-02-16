import { Card, Modal, ModalBody, ModalContent, Tab, Tabs } from "@heroui/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CodeEditor } from "../../../components/CodeEditor";
import { Form } from "../../../components/Form";
import { Player } from "../../../components/Player";
import { PlayerControls } from "../../../components/PlayerControls";
import { PlayerStats } from "../../../components/PlayerStats";
import { ScrollCard } from "../../../components/ScrollCard";
import { PlayerProvider } from "../../../context/PlayerContext";
import { useSwaggerSchema } from "../../../hooks/useSwaggerSchema";

export const Route = createFileRoute("/(dashboard)/_layout/player")({
  component: RouteComponent,
});

function RouteComponent() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const schema = useSwaggerSchema(
    `${window.__ENV__.PUBLIC_STITCHER_ENDPOINT}/openapi`,
    "/sessions",
  );

  const onSave = async (body: string) => {
    setError(null);

    const response = await fetch(
      `${window.__ENV__.PUBLIC_STITCHER_ENDPOINT}/sessions`,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      },
    );

    const data = await response.json();
    if (response.ok) {
      setUrl(data.url);
    } else {
      setError(data);
    }
  };

  return (
    <div className="h-screen p-8 flex gap-4">
      <PlayerProvider>
        <div className="grow flex flex-col gap-4">
          <div className="bg-default-100 rounded-lg overflow-hidden shrink-0">
            <div className="max-w-[500px] mx-auto">
              <Player url={url} />
            </div>
          </div>
          <Tabs
            classNames={{
              panel: "grow p-0",
            }}
          >
            <Tab key="config" title="Config">
              <ScrollCard>
                <Form
                  submit="Load"
                  fields={{
                    url: {
                      label: "URL",
                      type: "string",
                      value: url,
                    },
                  }}
                  onSubmit={async (values) => {
                    setUrl(values.url);
                  }}
                />
              </ScrollCard>
            </Tab>
            <Tab key="stats" title="Stats">
              <ScrollCard>
                <PlayerStats />
              </ScrollCard>
            </Tab>
            <Tab key="controls" title="Controls">
              <ScrollCard>
                <PlayerControls />
              </ScrollCard>
            </Tab>
          </Tabs>
        </div>
      </PlayerProvider>
      <Card className="w-[420px] py-4">
        <CodeEditor
          schema={schema}
          localStorageKey="stitcherEditor"
          onSave={onSave}
        />
      </Card>
      <Modal
        isOpen={error !== null}
        onClose={() => setError(null)}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalBody className="p-4">
            <pre className="text-xs text-red-500">
              {JSON.stringify(error, null, 2)}
            </pre>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
