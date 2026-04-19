type MaterialNoteInput = {
  title: string;
  analysis?: { summary: string; keyPoints: string[] } | null;
  extractedText?: string | null;
  description?: string | null;
  attachments: Array<{ title?: string | null }>;
};

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseAttachmentSummaries(extractedText?: string | null) {
  if (!extractedText?.trim()) {
    return [];
  }

  const matches = Array.from(extractedText.matchAll(/Attachment:\s*(.+?)\n([\s\S]*?)(?=\n---\n|$)/g));

  return matches
    .map((match) => {
      const title = normalizeInlineText(match[1] ?? "");
      const body = normalizeInlineText(match[2] ?? "");

      if (!title || !body) {
        return null;
      }

      const excerpt = body.length > 260 ? `${body.slice(0, 260).trim()}...` : body;
      return { title, excerpt };
    })
    .filter((value): value is { title: string; excerpt: string } => Boolean(value));
}

export function buildMaterialNoteContent(material: MaterialNoteInput) {
  const sections: string[] = [];
  const mainSummary =
    normalizeInlineText(material.analysis?.summary ?? "") ||
    normalizeInlineText(material.description ?? "") ||
    "";

  if (mainSummary) {
    sections.push(`Material summary\n${mainSummary}`);
  }

  if (material.analysis?.keyPoints?.length) {
    sections.push(`Key takeaways\n- ${material.analysis.keyPoints.slice(0, 4).join("\n- ")}`);
  }

  const attachmentTitles = material.attachments
    .map((attachment) => normalizeInlineText(attachment.title ?? ""))
    .filter(Boolean);

  if (attachmentTitles.length > 0) {
    sections.push(`Attached files\n- ${attachmentTitles.join("\n- ")}`);
  }

  const attachmentSummaries = parseAttachmentSummaries(material.extractedText);
  if (attachmentSummaries.length > 0) {
    sections.push(
      `What the attachments contain\n- ${attachmentSummaries
        .map((attachment) => `${attachment.title}: ${attachment.excerpt}`)
        .join("\n- ")}`
    );
  } else {
    const fallbackExcerpt = normalizeInlineText(material.extractedText ?? "");
    if (fallbackExcerpt) {
      const excerpt = fallbackExcerpt.length > 420 ? `${fallbackExcerpt.slice(0, 420).trim()}...` : fallbackExcerpt;
      sections.push(`Attachment context\n${excerpt}`);
    }
  }

  return sections.filter(Boolean).join("\n\n").trim();
}
