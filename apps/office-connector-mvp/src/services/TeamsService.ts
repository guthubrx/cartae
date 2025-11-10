/**
 * Teams Service - Stub
 */

export interface Channel {
  id: string;
  displayName: string;
}

export interface Team {
  id: string;
  displayName: string;
}

export class TeamsService {
  async getTeams(): Promise<Team[]> {
    return [];
  }

  async getChannels(teamId: string): Promise<Channel[]> {
    return [];
  }
}

export default new TeamsService();
