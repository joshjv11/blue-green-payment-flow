
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md border-green-200 dark:border-green-800 shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-3 rounded-full w-fit mb-4">
                        <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">Payment Successful!</CardTitle>
                    <CardDescription>
                        Thank you for your purchase. Your payment works perfectly.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <p className="text-center text-muted-foreground">
                        Your transaction has been completed successfully.
                        You will receive a confirmation email shortly.
                    </p>

                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                        onClick={() => navigate('/dashboard')}
                    >
                        Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentSuccess;
