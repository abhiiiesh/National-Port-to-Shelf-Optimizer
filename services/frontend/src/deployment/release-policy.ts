export interface FrontendReleaseMetadata {
  version: string;
  commitSha: string;
  buildTimestampIso: string;
  sourceMapUploadId: string;
}

export interface FrontendReleasePolicyResult {
  valid: boolean;
  issues: string[];
}

const semanticVersionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
const shaRegex = /^[a-f0-9]{7,40}$/;

export const validateReleaseMetadata = (
  metadata: FrontendReleaseMetadata
): FrontendReleasePolicyResult => {
  const issues: string[] = [];

  if (!semanticVersionRegex.test(metadata.version)) {
    issues.push('version must follow semantic versioning (e.g. 1.2.3)');
  }

  if (!shaRegex.test(metadata.commitSha)) {
    issues.push('commitSha must be a lowercase git sha');
  }

  if (Number.isNaN(Date.parse(metadata.buildTimestampIso))) {
    issues.push('buildTimestampIso must be a valid ISO datetime');
  }

  if (!metadata.sourceMapUploadId.trim()) {
    issues.push('sourceMapUploadId must be provided for diagnostics');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
