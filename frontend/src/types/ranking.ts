export interface RankerInfo {
  userId: string;
  username: string;
  points: number;
  rank: number;
  schoolName?: string;
}

export interface MyRankInfo {
  rank: number;
  points: number;
  username: string;
}

export interface PersonalRankingResponse {
  topRankers: RankerInfo[];
  myRank: MyRankInfo;
}

export interface SchoolRankInfo {
  schoolName: string;
  totalPoints: number;
  rank: number;
  memberCount: number | null;
}

export interface SchoolRankingResponse {
  topSchools: SchoolRankInfo[];
  mySchool: SchoolRankInfo | null;
}
