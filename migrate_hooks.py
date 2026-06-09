import re

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace("import { usePolling } from '@/hooks/usePolling'", "import { useQuery } from '@tanstack/react-query'")

    # MapPage replacements
    content = re.sub(
        r'const \{\s*data:\s*fleetMeta,\s*refresh:\s*refreshFleetMeta\s*\} = usePolling<[^>]+>\(\s*([^,]+),\s*30_000\s*\)',
        r'const { data: fleetMeta, refetch: refreshFleetMeta } = useQuery({ queryKey: [\"fleetMeta\"], queryFn: \1, refetchInterval: 30000 })',
        content
    )
    content = re.sub(
        r'const \{\s*data:\s*garages\s*\} = usePolling<Garage\[\]>\(\s*([^,]+),\s*86400_000\s*\)',
        r'const { data: garages } = useQuery({ queryKey: [\"garages\"], queryFn: \1, refetchInterval: 86400000 })',
        content
    )

    # RoutePage replacements
    content = re.sub(
        r'const \{\s*data:\s*stops,\s*error:\s*stopsError,\s*refresh:\s*refreshStops\s*\} = usePolling<RouteStop\[\]>\(stopsFetcher,\s*300_000\)',
        r'const { data: stops, error: stopsError, refetch: refreshStops } = useQuery({ queryKey: [\"stops\", hatKodu], queryFn: stopsFetcher, refetchInterval: 300000 })',
        content
    )
    content = re.sub(
        r'const \{\s*data:\s*schedule,\s*error:\s*scheduleError,\s*refresh:\s*refreshSchedule\s*\} = usePolling<ScheduledDeparture\[\]>\(scheduleFetcher,\s*300_000\)',
        r'const { data: schedule, error: scheduleError, refetch: refreshSchedule } = useQuery({ queryKey: [\"schedule\", hatKodu], queryFn: scheduleFetcher, refetchInterval: 300000 })',
        content
    )
    content = re.sub(
        r'const \{\s*data:\s*announcements,\s*error:\s*announcementsError,\s*refresh:\s*refreshAnnouncements\s*\} = usePolling<Announcement\[\]>\(announceFetcher,\s*300_000\)',
        r'const { data: announcements, error: announcementsError, refetch: refreshAnnouncements } = useQuery({ queryKey: [\"announcements\", hatKodu], queryFn: announceFetcher, refetchInterval: 300000 })',
        content
    )
    content = re.sub(
        r'const \{\s*data:\s*metadata\s*\} = usePolling<RouteMetadata\[\]>\(metaFetcher,\s*600_000\)',
        r'const { data: metadata } = useQuery({ queryKey: [\"metadata\", hatKodu], queryFn: metaFetcher, refetchInterval: 600000 })',
        content
    )

    # StopPage replacements
    content = re.sub(
        r'const \{\s*data:\s*routes\s*\} = usePolling<string\[\]>\(\s*([^,]+),\s*3600_000\s*\)',
        r'const { data: routes } = useQuery({ queryKey: [\"routesAtStop\", id], queryFn: \1, refetchInterval: 3600000 })',
        content
    )
    content = re.sub(
        r'const \{\s*data:\s*stopDetail\s*\} = usePolling<StopDetail>\(\s*([^,]+),\s*86400_000\s*\)',
        r'const { data: stopDetail } = useQuery({ queryKey: [\"stopDetail\", id], queryFn: \1, refetchInterval: 86400000 })',
        content
    )
    content = re.sub(
        r'const \{\s*data:\s*polledAnnouncements\s*\} = usePolling<RouteAnnouncement\[\]>\(annsFetcher,\s*300_000\s*\)',
        r'const { data: polledAnnouncements } = useQuery({ queryKey: [\"stopAnnouncements\", routes?.join(\",\")], queryFn: annsFetcher, refetchInterval: 300000, enabled: !!routes })',
        content
    )

    # Error handling fix for RoutePage
    content = content.replace("stopsError || scheduleError || announcementsError", "String(stopsError || scheduleError || announcementsError)")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

migrate_file('src/pages/MapPage.tsx')
migrate_file('src/pages/RoutePage.tsx')
migrate_file('src/pages/StopPage.tsx')
