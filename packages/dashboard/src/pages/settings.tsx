import type { NextPage } from 'next';
import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Button, Text, useDisclosure, useToast } from '@chakra-ui/react';
import Layout from '../components/Layout';
import { useLogoutMutation, useRestartMutation, useUpdateMutation, useVersionQuery } from '../generated/graphql';
import { useRef, useState } from 'react';

const Settings: NextPage = () => {
  const toast = useToast();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const cancelRef = useRef<any>();
  const [loading, setLoading] = useState(false);
  const { data } = useVersionQuery();

  const [restart] = useRestartMutation();
  const [update] = useUpdateMutation();
  const [logout] = useLogoutMutation({ refetchQueries: ['Me'] });
  const isLatest = data?.version.latest === data?.version.current;

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        position: 'top',
        isClosable: true,
      });
    }
  };

  const renderUpdate = () => {
    if (isLatest) {
      return (
        <Text fontSize="md" color="green.500">
          Your Tipi install is up to date. Version {data?.version.current}
        </Text>
      );
    }

    return (
      <>
        <Text fontSize="md">New version available</Text>
        <Button onClick={updateDisclosure.onOpen} className="mr-2" colorScheme="green">
          Update to {data?.version.latest}
        </Button>
      </>
    );
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      restart();
      logout();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      update();
      logout();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout loading={!data?.version && loading}>
      <Text fontSize="3xl" className="font-bold">
        Settings
      </Text>
      {renderUpdate()}
      <Button onClick={restartDisclosure.onOpen} colorScheme="gray">
        Restart
      </Button>
      <AlertDialog isOpen={restartDisclosure.isOpen} leastDestructiveRef={cancelRef} onClose={restartDisclosure.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Restart Tipi
            </AlertDialogHeader>
            <AlertDialogBody>Would you like to restart your Tipi server?</AlertDialogBody>
            <AlertDialogFooter>
              <Button colorScheme="gray" ref={cancelRef} onClick={restartDisclosure.onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" isLoading={loading} onClick={handleRestart} ml={3}>
                Restart
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <AlertDialog isOpen={updateDisclosure.isOpen} leastDestructiveRef={cancelRef} onClose={updateDisclosure.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Update Tipi
            </AlertDialogHeader>
            <AlertDialogBody>Would you like to update Tipi to the latest version?</AlertDialogBody>
            <AlertDialogFooter>
              <Button colorScheme="gray" ref={cancelRef} onClick={updateDisclosure.onClose}>
                Cancel
              </Button>
              <Button colorScheme="green" isLoading={loading} onClick={handleUpdate} ml={3}>
                Update
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Layout>
  );
};

export default Settings;
