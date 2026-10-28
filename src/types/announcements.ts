export interface PwaAnnouncement {
  id: number
  date: string
  startDate: string
  endDate: string
  title: string
  isIgnorable: boolean
  isSingleShow: boolean
  content: string
}

export interface PwaAnnouncementsData {
  announcements: PwaAnnouncement[]
}
