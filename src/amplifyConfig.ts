let _cloudFrontDomain: string | undefined;

export function setCloudFrontDomain(domain: string | undefined) {
  _cloudFrontDomain = domain;
}

export function getCloudFrontDomain(): string | undefined {
  return _cloudFrontDomain;
}
