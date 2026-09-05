import { invokeAi } from '@/lib/ai/invoke';
import { ASK_FALLBACK, buildAskInstructions, type AskLiveContext } from '@/lib/ai/askPrompt';
import { gauthRefusalCard, shouldRefuseAskBeforeVendor } from '@/lib/ai/askHomeworkRefuse';
import { askToolsFor, type AskToolContext } from '@/lib/ai/askTools';
import { loadGrants } from '@/lib/school/matrixApi';
import type { ProfileRow } from '@/lib/supabase/types';

export type AskChatLine = {
  from: 'user' | 'assistant';
  text: string;
  imageUrl?: string | null;
  imageMime?: string | null;
};

export type AskAgentTurn = {
  text: string;
  didWork: boolean;
  href?: string;
};

type AskAssistantReply = {
  text?: string;
  responseId?: string;
  toolCalls?: Array<{
    call_id: string;
    name: string;
    arguments: string;
    thoughtSignature?: string;
  }>;
};

type ContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'auto' | 'low' | 'high' };

type InputItem =
  | { role: 'user' | 'assistant'; content: string | ContentPart[] }
  | {
      type: 'function_call';
      call_id: string;
      name: string;
      arguments: string;
      thoughtSignature?: string;
    }
  | { type: 'function_call_output'; call_id: string; output: string };

function asHistoryItem(item: AskChatLine): InputItem | null {
  const text = item.text.trim();
  if (item.from === 'assistant') return text ? { role: 'assistant', content: text } : null;
  if (item.imageUrl) {
    return {
      role: 'user',
      content: [
        { type: 'input_text', text: text || 'Look at this photo and help me file it in Kelyra.' },
        { type: 'input_image', image_url: item.imageUrl, detail: 'low' },
      ],
    };
  }
  return text ? { role: 'user', content: text } : null;
}

const MAX_ROUNDS = 8;

/** Only the newest photo is sent. Older ones stay as text so later rounds stay cheap. */
function keepLatestImage(items: InputItem[]): InputItem[] {
  let kept = false;
  const next: InputItem[] = [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (!item || !('content' in item) || !Array.isArray(item.content)) {
      next.push(item);
      continue;
    }
    const image = item.content.some((part) => part.type === 'input_image');
    if (!image) {
      next.push(item);
      continue;
    }
    if (!kept) {
      kept = true;
      next.push(item);
      continue;
    }
    next.push({
      ...item,
      content: item.content
        .filter((part) => part.type !== 'input_image')
        .concat([{ type: 'input_text', text: '(Earlier photo omitted.)' }]),
    });
  }
  return next.reverse();
}

export async function runAskAgent(input: {
  profile: ProfileRow | null;
  teacherId: string | null;
  classId: string | null;
  live: AskLiveContext;
  messages: AskChatLine[];
  onStatus?: (text: string) => void;
}): Promise<AskAgentTurn> {
  const grants = await loadGrants();
  const photoLine = [...input.messages].reverse().find((item) => item.imageUrl);
  const ctx: AskToolContext = {
    profile: input.profile,
    teacherId: input.teacherId,
    classId: input.classId,
    grants,
    live: input.live,
    photo: photoLine?.imageUrl
      ? { imageUrl: photoLine.imageUrl, mimeType: photoLine.imageMime || 'image/jpeg' }
      : null,
  };
  const tools = askToolsFor(ctx);
  const latest = input.messages[input.messages.length - 1];
  const latestHasImage = Boolean(latest?.imageUrl);
  // Client mirror of Edge G0 — server remains SoT; skip vendor round-trip on clear refuse.
  if (
    shouldRefuseAskBeforeVendor({
      role: input.live.role,
      text: latest?.text ?? '',
      hasImage: latestHasImage,
    })
  ) {
    const card = gauthRefusalCard();
    return { text: card.text, didWork: false };
  }
  const familyNoVision =
    input.live.role === 'student'
      ? input.messages.map((m) => ({ ...m, imageUrl: null, imageMime: null }))
      : input.messages;
  const instructions = buildAskInstructions({
    role: input.live.role,
    toolNames: tools.names,
    context: input.live,
    latestHasImage: familyNoVision !== input.messages ? false : latestHasImage,
  });
  const history: InputItem[] = keepLatestImage(
    familyNoVision.map(asHistoryItem).filter((item): item is InputItem => Boolean(item)),
  );

  let href: string | undefined;
  let didWork = false;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    input.onStatus?.(didWork ? 'Working…' : latestHasImage && round === 0 ? 'Looking at the photo…' : 'Asking AI…');
    const reply = await invokeAi<AskAssistantReply>('ask-assistant', {
      role: input.live.role,
      classId: input.classId,
      studentId: input.live.studentId,
      instructions,
      input: history.length ? history : [{ role: 'user', content: 'Hello' }],
      tools: tools.defs,
      toolNames: tools.names,
    });

    if (reply.toolCalls?.length) {
      didWork = true;
      // Push all function_call items first, then all outputs, so parallel tool
      // rounds stay one model turn + one user turn (required for Gemini 3).
      for (const call of reply.toolCalls) {
        history.push({
          type: 'function_call',
          call_id: call.call_id,
          name: call.name,
          arguments: call.arguments ?? '{}',
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        });
      }
      for (const call of reply.toolCalls) {
        input.onStatus?.(`${call.name.replace(/_/g, ' ')}…`);
        const result = await tools.run(call.name, call.arguments ?? '{}');
        if (result.href) href = result.href;
        history.push({ type: 'function_call_output', call_id: call.call_id, output: result.json });
      }
      continue;
    }

    const text = reply.text?.trim();
    return {
      text: text || (didWork ? 'Done. I saved what I could from that request.' : ASK_FALLBACK),
      didWork,
      href,
    };
  }

  return {
    text: didWork
      ? 'I started that work, then stopped. Check People or the class card to confirm what was saved.'
      : ASK_FALLBACK,
    didWork,
    href,
  };
}
