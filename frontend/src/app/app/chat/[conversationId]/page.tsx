import React, { Suspense } from 'react';
import { ConversationWorkspace } from '@/components/ConversationWorkspace';

type PageProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

async function ChatConversationContent({ params }: PageProps) {
  const { conversationId } = await params;
  return <ConversationWorkspace conversationId={conversationId} />;
}

export default function ChatConversationPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#080B14]" />}>
      <ChatConversationContent params={params} />
    </Suspense>
  );
}
