'use client'

import { MapContainer, MapContainerProps } from 'react-leaflet'

export default function ClientMapContainer(props: MapContainerProps) {
  return <MapContainer {...props}>{props.children}</MapContainer>
}
