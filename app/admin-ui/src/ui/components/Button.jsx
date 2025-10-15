import React from 'react'

const VARIANTS = {
  primary: 'button button--primary',
  subtle: 'button',
  ghost: 'button button--ghost',
}

const SIZES = {
  md: 'button--md',
  sm: 'button--sm',
}

export default function Button({ variant = 'subtle', size = 'md', icon: Icon, children, ...rest }) {
  const variantClass = VARIANTS[variant] || VARIANTS.subtle
  const sizeClass = SIZES[size] || SIZES.md
  return (
    <button className={`${variantClass} ${sizeClass}`} {...rest}>
      {Icon && <Icon size={16} />}
      <span>{children}</span>
    </button>
  )
}
