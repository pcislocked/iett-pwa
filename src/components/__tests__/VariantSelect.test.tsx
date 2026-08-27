import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VariantSelect } from '../VariantSelect'
import { RouteMetadata } from '@/api/client'

const mockMetadata: RouteMetadata[] = [
  {
    hat_kodu: '500T',
    variant_code: '500T_G_G0',
    direction: 0,
    direction_name: 'Gidiş',
    full_name: 'TUZLA - CEVİZLİBAĞ (Gidiş)',
    depar_no: 1,
  },
  {
    hat_kodu: '500T',
    variant_code: '500T_G_G1',
    direction: 0,
    direction_name: 'Gidiş',
    full_name: 'TUZLA - CEVİZLİBAĞ Ekspres (Gidiş)',
    depar_no: 2,
  },
  {
    hat_kodu: '500T',
    variant_code: '500T_D_D0',
    direction: 1,
    direction_name: 'Dönüş',
    full_name: 'CEVİZLİBAĞ - TUZLA (Dönüş)',
    depar_no: 1,
  },
]

describe('VariantSelect Component', () => {
  it('returns null if there are no variants or only 1 variant', () => {
    const { container } = render(
      <VariantSelect
        metadata={null}
        stopsDirections={[]}
        selectedVariant=""
        selectedDirection=""
        onChange={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()

    const singleMeta: RouteMetadata[] = [
      {
        hat_kodu: '500T',
        variant_code: '500T_G_G0',
        direction: 0,
        direction_name: 'Gidiş',
        full_name: 'TUZLA - CEVİZLİBAĞ',
        depar_no: 1,
      },
    ]

    const { container: singleContainer } = render(
      <VariantSelect
        metadata={singleMeta}
        stopsDirections={['G']}
        selectedVariant="500T_G_G0"
        selectedDirection="G"
        onChange={vi.fn()}
      />
    )
    expect(singleContainer.firstChild).toBeNull()
  })

  it('renders dropdown and displays selected variant name', () => {
    render(
      <VariantSelect
        metadata={mockMetadata}
        stopsDirections={['G', 'D']}
        selectedVariant="500T_G_G0"
        selectedDirection="G"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('TUZLA - CEVİZLİBAĞ (Gidiş)')).toBeInTheDocument()
  })

  it('opens options on click and handles variant selection', () => {
    const handleChange = vi.fn()
    render(
      <VariantSelect
        metadata={mockMetadata}
        stopsDirections={['G', 'D']}
        selectedVariant="500T_G_G0"
        selectedDirection="G"
        onChange={handleChange}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Option should be visible
    const returnOption = screen.getByText('CEVİZLİBAĞ - TUZLA (Dönüş)')
    expect(returnOption).toBeInTheDocument()

    fireEvent.click(returnOption)
    expect(handleChange).toHaveBeenCalledWith('500T_D_D0', 'D')
  })

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <VariantSelect
          metadata={mockMetadata}
          stopsDirections={['G', 'D']}
          selectedVariant="500T_G_G0"
          selectedDirection="G"
          onChange={vi.fn()}
        />
      </div>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText('CEVİZLİBAĞ - TUZLA (Dönüş)')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('CEVİZLİBAĞ - TUZLA (Dönüş)')).not.toBeInTheDocument()
  })
})
