/**
 * Adapter simple pour IAuthService
 * Wrapper autour d'un token fixe pour le backend
 */

export interface IAuthService {
  getToken(service: 'owa' | 'graph' | 'sharepoint' | 'teams'): Promise<string>;
}

export class SimpleAuthAdapter implements IAuthService {
  constructor(private token: string) {}

  async getToken(_service: 'owa' | 'graph' | 'sharepoint' | 'teams'): Promise<string> {
    return this.token;
  }
}
