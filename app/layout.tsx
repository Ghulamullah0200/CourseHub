import './style.css';
export const metadata = { title:'CourseHub | Academy Management', description:'SQL powered academy enrollment and fee management' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
