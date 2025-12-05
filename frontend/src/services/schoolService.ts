import { apiClient } from '../lib/api';

export interface School {
  id: number;
  name: string;
  type: 'HIGH' | 'MIDDLE';
  region: string;
}

export const schoolService = {
  /**
   * Fetch all schools with full information (id, name, type, region)
   * Used for client-side filtering in signup/profile forms
   */
  async getAllSchools(): Promise<School[]> {
    try {
      const schools = await apiClient.get<School[]>('/schools/all');
      return schools;
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      throw error;
    }
  },

  /**
   * LEGACY: Fetch schools by type (returns name only)
   * Kept for backward compatibility
   */
  async getSchoolsByType(type: 'HIGH' | 'MIDDLE'): Promise<string[]> {
    try {
      const schools = await apiClient.get<string[]>(`/schools/type?type=${type}`);
      return schools;
    } catch (error) {
      console.error('Failed to fetch schools by type:', error);
      throw error;
    }
  },

  /**
   * Extract unique regions from school list for region filter dropdown
   */
  getUniqueRegions(schools: School[]): string[] {
    const regions = new Set(schools.map(s => s.region).filter(r => r && r !== '미분류'));
    return Array.from(regions).sort();
  },

  /**
   * Filter schools by multiple criteria (client-side filtering)
   * @param schools - Full list of schools
   * @param filters - Filter criteria
   * @returns Filtered school list
   */
  filterSchools(
    schools: School[],
    filters: {
      type?: 'HIGH' | 'MIDDLE' | '';
      region?: string;
      searchTerm?: string;
    }
  ): School[] {
    let filtered = [...schools];

    // Filter by type
    if (filters.type && filters.type !== '') {
      filtered = filtered.filter(s => s.type === filters.type);
    }

    // Filter by region
    if (filters.region && filters.region !== '') {
      filtered = filtered.filter(s => s.region === filters.region);
    }

    // Filter by search term (case-insensitive)
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(term)
      );
    }

    return filtered;
  },
};
