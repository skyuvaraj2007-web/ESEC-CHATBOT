import React, { Suspense } from 'react';
import { ConversationWorkspace } from '@/components/ConversationWorkspace';

export default function AppPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#080B14]" />}>
      <ConversationWorkspace />
    </Suspense>
  );
}
